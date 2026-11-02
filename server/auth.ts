import type { Express, Request, RequestHandler, Response } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import * as oidc from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { storage } from "./storage";

declare global {
  namespace Express {
    interface User {
      claims: Record<string, unknown> & { sub: string; exp?: number };
      refresh_token?: string;
      access_token?: string;
      expires_at?: number;
    }
  }
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let oidcConfigPromise: Promise<oidc.Configuration> | undefined;

function getOidcConfig(): Promise<oidc.Configuration> {
  const clientId = process.env.REPL_ID;
  if (!clientId) throw new Error("Replit Auth requires the REPL_ID environment value.");

  if (!oidcConfigPromise) {
    const issuer = new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc");
    const discoveryOptions = process.env.NODE_ENV === "test" && issuer.protocol === "http:"
      ? { execute: [oidc.allowInsecureRequests] }
      : undefined;
    oidcConfigPromise = oidc.discovery(issuer, clientId, undefined, undefined, discoveryOptions).catch((error) => {
      oidcConfigPromise = undefined;
      throw error;
    });
  }
  return oidcConfigPromise;
}

function getAllowedHosts(): Set<string> {
  const hosts = (process.env.REPLIT_DOMAINS ?? "")
    .split(/[,\s]+/)
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") {
    hosts.push("localhost", "127.0.0.1", "::1");
  }
  return new Set(hosts);
}

function getRequestOrigin(req: Request): string | undefined {
  const host = req.get("host");
  if (!host) return undefined;

  const hostname = req.hostname.toLowerCase();
  if (!getAllowedHosts().has(hostname)) return undefined;

  const protocol = req.protocol.toLowerCase();
  if (protocol !== "https" && protocol !== "http") return undefined;
  if (process.env.NODE_ENV === "production" && protocol !== "https") return undefined;

  try {
    const origin = new URL(`${protocol}://${host}`);
    if (origin.hostname.toLowerCase() !== hostname) return undefined;
    return origin.origin;
  } catch {
    return undefined;
  }
}

export function requireSameOrigin(req: Request, res: Response): boolean {
  const expectedOrigin = getRequestOrigin(req);
  const suppliedOrigin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");
  if (
    !expectedOrigin ||
    !suppliedOrigin ||
    fetchSite === "cross-site" ||
    fetchSite === "none"
  ) {
    res.status(403).json({ error: "Request origin could not be verified" });
    return false;
  }

  try {
    if (new URL(suppliedOrigin).origin !== expectedOrigin) {
      res.status(403).json({ error: "Request origin could not be verified" });
      return false;
    }
  } catch {
    res.status(403).json({ error: "Request origin could not be verified" });
    return false;
  }
  return true;
}

function getSessionMiddleware(): RequestHandler {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for persistent authentication sessions.");
  }

  const PgSessionStore = connectPg(session);
  const store = new PgSessionStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: SESSION_TTL_MS / 1000,
    tableName: "sessions",
  });

  return session({
    name: "playops.sid",
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      path: "/",
    },
  });
}

function profileFromClaims(claims: Record<string, unknown> & { sub: string }) {
  const first = typeof claims.first_name === "string" ? claims.first_name : "";
  const last = typeof claims.last_name === "string" ? claims.last_name : "";
  const displayName =
    (typeof claims.name === "string" && claims.name) ||
    [first, last].filter(Boolean).join(" ") ||
    (typeof claims.username === "string" && claims.username) ||
    "Replit user";

  return {
    id: claims.sub,
    name: displayName,
    username:
      (typeof claims.username === "string" && claims.username) ||
      displayName,
    email: typeof claims.email === "string" ? claims.email : null,
    avatarUrl: typeof claims.profile_image_url === "string"
      ? claims.profile_image_url
      : typeof claims.picture === "string"
        ? claims.picture
        : null,
  };
}

async function clearSession(req: Request): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (!req.isAuthenticated?.() || typeof req.logout !== "function") {
      resolve();
      return;
    }
    req.logout((error) => error ? reject(error) : resolve());
  });
  await new Promise<void>((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.destroy((error) => error ? reject(error) : resolve());
  });
}

async function getValidIdentity(req: Request): Promise<Express.User | undefined> {
  if (!req.isAuthenticated?.()) return undefined;
  let identity = req.user as Express.User | undefined;
  if (!identity?.claims?.sub) return undefined;

  const expiry = identity.expires_at ?? identity.claims.exp;
  if (typeof expiry === "number" && expiry > Math.floor(Date.now() / 1000) + 30) {
    return identity;
  }

  if (!identity.refresh_token) {
    await clearSession(req);
    return undefined;
  }

  try {
    const config = await getOidcConfig();
    const refreshed = await oidc.refreshTokenGrant(config, identity.refresh_token);
    const claims = refreshed.claims();
    if (!claims?.sub || typeof claims.exp !== "number") {
      await clearSession(req);
      return undefined;
    }
    identity = {
      claims: claims as Express.User["claims"],
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? identity.refresh_token,
      expires_at: claims.exp,
    };
    req.user = identity;
    const passportSession = (req.session as unknown as { passport?: { user?: Express.User } } | undefined)?.passport;
    if (passportSession) passportSession.user = identity;
    return identity;
  } catch {
    await clearSession(req);
    return undefined;
  }
}

export const requireAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const identity = await getValidIdentity(req);
    if (!identity) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export async function setupAuth(app: Express): Promise<void> {
  app.set("trust proxy", 1);
  app.use(getSessionMiddleware());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user as Express.User));

  const config = await getOidcConfig();
  if (process.env.NODE_ENV === "test" && process.env.ISSUER_URL) {
    oidc.allowInsecureRequests(config);
  }
  const strategyNames = new Map<string, string>();
  const ensureStrategy = (req: Request): string | undefined => {
    const origin = getRequestOrigin(req);
    if (!origin) return undefined;
    let strategyName = strategyNames.get(origin);
    if (!strategyName) {
      strategyName = `replit:${new URL(origin).host}`;
      const verify: VerifyFunction = async (tokens, verified) => {
        try {
          const claims = tokens.claims();
          if (!claims?.sub) throw new Error("Replit Auth did not return a user identity.");
          const profile = profileFromClaims(claims as Record<string, unknown> & { sub: string });
          await storage.upsertReplitUser({
            subject: claims.sub,
            email: typeof claims.email === "string" ? claims.email : null,
            username: profile.username,
          });
          verified(null, {
            claims: claims as Express.User["claims"],
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: claims.exp,
          });
        } catch (error) {
          verified(error instanceof Error ? error : new Error("Unable to save account."));
        }
      };
      passport.use(
        strategyName,
        new Strategy(
          {
            name: strategyName,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `${origin}/api/callback`,
          },
          verify,
        ),
      );
      strategyNames.set(origin, strategyName);
    }
    return strategyName;
  };

  app.get("/api/login", (req, res, next) => {
    const strategyName = ensureStrategy(req);
    if (!strategyName) {
      res.status(400).send("This sign-in address is not configured for PlayOps.");
      return;
    }
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const strategyName = ensureStrategy(req);
    if (!strategyName) {
      res.status(400).send("This sign-in address is not configured for PlayOps.");
      return;
    }
    passport.authenticate(strategyName, {
      successRedirect: "/app",
      failureRedirect: "/app?auth=failed",
    })(req, res, next);
  });

  app.get("/api/auth/user", async (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const hadAuthenticatedSession = req.isAuthenticated?.() === true;
      const identity = await getValidIdentity(req);
      if (hadAuthenticatedSession && !identity) {
        res.clearCookie("playops.sid", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
      const profile = identity ? profileFromClaims(identity.claims) : null;
      res.json({
        user: profile ? {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
        } : null,
        sessionExpired: hadAuthenticatedSession && !identity,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", async (req, res, next) => {
    if (!requireSameOrigin(req, res)) return;
    try {
      await clearSession(req);
      res.setHeader("Cache-Control", "no-store");
      res.clearCookie("playops.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
}

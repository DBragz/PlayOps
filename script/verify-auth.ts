import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import express from "express";
import { createServer, type Server } from "node:http";
import { Pool } from "pg";
import type { AddressInfo } from "node:net";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: "jwk" });
const signingKey = {
  ...publicJwk,
  kid: "playops-test-key",
  alg: "RS256",
  use: "sig",
};

function jwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: signingKey.kid, typ: "JWT" }))
    .toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url");
  return `${unsigned}.${signature}`;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function cookieFrom(response: Response, previous?: string): string {
  const header = response.headers.get("set-cookie");
  return header?.split(";")[0] ?? previous ?? "";
}

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Run the auth verification with a configured PostgreSQL database.");
  }

  process.env.NODE_ENV = "test";
  process.env.REPL_ID = "playops-controlled-test-client";
  process.env.SESSION_SECRET = "test-only-session-secret-32-characters-minimum";
  process.env.REPLIT_DOMAINS = "127.0.0.1";

  let currentSubject = "";
  let currentExpirySeconds = 3600;
  let currentProvidesRefreshToken = false;
  const testSubjects: string[] = [];
  const pendingCodes = new Map<string, { subject: string; nonce: string; challenge: string }>();
  const issuerServer = express();
  issuerServer.use(express.urlencoded({ extended: false }));

  const providerServer = createServer(issuerServer);
  const issuerPort = await listen(providerServer);
  const issuer = `http://127.0.0.1:${issuerPort}`;
  process.env.ISSUER_URL = issuer;

  issuerServer.get("/.well-known/openid-configuration", (_req, res) => {
    res.json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/jwks`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      grant_types_supported: ["authorization_code"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["openid", "email", "profile", "offline_access"],
    });
  });

  issuerServer.get("/jwks", (_req, res) => res.json({ keys: [signingKey] }));
  issuerServer.get("/authorize", (req, res) => {
    const { redirect_uri, state, nonce, code_challenge, code_challenge_method } = req.query;
    assert.equal(typeof redirect_uri, "string");
    assert.equal(typeof code_challenge, "string");
    assert.equal(code_challenge_method, "S256", "The OIDC strategy must use PKCE S256.");
    const code = randomUUID();
    pendingCodes.set(code, {
      subject: currentSubject,
      nonce: typeof nonce === "string" ? nonce : "",
      challenge: String(code_challenge),
    });
    const callback = new URL(String(redirect_uri));
    callback.searchParams.set("code", code);
    if (typeof state === "string") callback.searchParams.set("state", state);
    res.redirect(callback.toString());
  });
  issuerServer.post("/token", (req, res) => {
    if (req.body.grant_type === "refresh_token") {
      const subject = String(req.body.refresh_token).replace(/^refresh-/, "");
      const now = Math.floor(Date.now() / 1000);
      const idToken = jwt({
        iss: issuer,
        aud: process.env.REPL_ID,
        sub: subject,
        iat: now,
        exp: now + 3600,
        name: `Coach ${subject}`,
        email: `${subject}@example.test`,
        email_verified: true,
      });
      res.json({
        access_token: randomUUID(),
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: `refresh-${subject}-rotated`,
        id_token: idToken,
      });
      return;
    }

    const exchange = pendingCodes.get(String(req.body.code));
    assert.ok(exchange, "The provider should receive a valid authorization code.");
    const verifier = String(req.body.code_verifier);
    assert.equal(
      createHash("sha256").update(verifier).digest("base64url"),
      exchange.challenge,
      "The callback must prove possession of the PKCE verifier.",
    );
    pendingCodes.delete(String(req.body.code));

    const now = Math.floor(Date.now() / 1000);
    const idTokenClaims: Record<string, unknown> = {
      iss: issuer,
      aud: process.env.REPL_ID,
      sub: exchange.subject,
      iat: now,
      exp: now + currentExpirySeconds,
      name: `Coach ${exchange.subject}`,
      email: `${exchange.subject}@example.test`,
      email_verified: true,
    };
    if (exchange.nonce) idTokenClaims.nonce = exchange.nonce;
    const idToken = jwt(idTokenClaims);
    res.json({
      access_token: randomUUID(),
      token_type: "Bearer",
      expires_in: currentExpirySeconds,
      id_token: idToken,
      ...(currentProvidesRefreshToken ? { refresh_token: `refresh-${exchange.subject}` } : {}),
    });
  });

  const { registerRoutes } = await import("../server/routes");
  let activeServer: Server | undefined;

  try {
    const { server: apiServer, origin } = await startApi(registerRoutes);
    activeServer = apiServer;
    const anonymousPlays = await fetch(`${origin}/api/plays`);
    assert.equal(anonymousPlays.status, 401, "Anonymous users must not read account plays.");
    const forgedCreate = await fetch(`${origin}/api/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        userId: "forged-user-id",
        name: "Forged",
        sport: "basketball",
        data: emptyPlayData(),
      }),
    });
    assert.equal(forgedCreate.status, 401, "A body-supplied identity must never authenticate a request.");

    currentSubject = `auth-test-owner-${randomUUID()}`;
    testSubjects.push(currentSubject);
    currentExpirySeconds = 3600;
    currentProvidesRefreshToken = false;
    let ownerCookie = await signIn(origin);
    const ownerUserResponse = await fetch(`${origin}/api/auth/user`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(ownerUserResponse.status, 200);
    const ownerUserBody = await ownerUserResponse.json() as { user: Record<string, unknown> };
    assert.equal(ownerUserBody.user.id, currentSubject);
    assert.equal(ownerUserBody.user.email, `${currentSubject}@example.test`);
    assert.deepEqual(
      Object.keys(ownerUserBody.user).sort(),
      ["avatarUrl", "email", "id", "name"],
      "Current-user data must not include provider tokens or account credentials.",
    );
    const accountCheckPool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const accountRecord = await accountCheckPool.query<{
        id: string;
        username: string;
        email: string | null;
      }>(
        "SELECT id, username, email FROM users WHERE auth_provider = 'replit' AND provider_subject = $1",
        [currentSubject],
      );
      assert.equal(accountRecord.rowCount, 1, "Sign-in must upsert one database user.");
      assert.equal(accountRecord.rows[0].id, currentSubject, "The database user id must match the authenticated subject.");
      assert.match(accountRecord.rows[0].username, /^coach_auth_test_owner_/);
      assert.equal(accountRecord.rows[0].email, `${currentSubject}@example.test`);
    } finally {
      await accountCheckPool.end();
    }

    const sessionCookieFlags = (await fetch(`${origin}/api/auth/user`, {
      headers: { Cookie: ownerCookie },
    })).headers.get("set-cookie") ?? "";
    assert.match(sessionCookieFlags, /HttpOnly/i);
    assert.match(sessionCookieFlags, /SameSite=Lax/i);

    const createdResponse = await fetch(`${origin}/api/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie, Origin: origin },
      body: JSON.stringify({
        userId: "forged-other-account",
        name: "Private play",
        sport: "basketball",
        tags: ["private"],
        data: emptyPlayData(),
      }),
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json() as { id: string; userId: string; name: string };
    assert.equal(created.userId, currentSubject, "The owner must come from the verified provider subject.");

    const wrongOriginUpdate = await fetch(`${origin}/api/plays/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie, Origin: "https://attacker.invalid" },
      body: JSON.stringify({ name: "Cross-site edit" }),
    });
    assert.equal(wrongOriginUpdate.status, 403, "State changes must reject cross-origin requests.");

    const otherSession = await startApi(registerRoutes);
    activeServer = otherSession.server;
    await close(apiServer);
    const persistedSessionUser = await fetch(`${otherSession.origin}/api/auth/user`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(persistedSessionUser.status, 200);
    assert.equal(
      (await persistedSessionUser.json() as { user: { id: string } | null }).user?.id,
      currentSubject,
      "A PostgreSQL-backed login session should survive an API server restart.",
    );
    const persistedPlay = await fetch(`${otherSession.origin}/api/plays/${created.id}`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(persistedPlay.status, 200);
    assert.equal((await persistedPlay.json() as { name: string }).name, "Private play");

    const renamedResponse = await fetch(`${otherSession.origin}/api/plays/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie, Origin: otherSession.origin },
      body: JSON.stringify({ name: "Updated private play", userId: "forged-other-account" }),
    });
    assert.equal(renamedResponse.status, 200);
    assert.equal((await renamedResponse.json() as { name: string }).name, "Updated private play");

    currentSubject = `auth-test-other-${randomUUID()}`;
    testSubjects.push(currentSubject);
    currentExpirySeconds = 3600;
    currentProvidesRefreshToken = false;
    const otherCookie = await signIn(otherSession.origin);
    const otherRead = await fetch(`${otherSession.origin}/api/plays/${created.id}`, {
      headers: { Cookie: otherCookie },
    });
    assert.equal(otherRead.status, 404, "Another account must not read the owner's play.");
    const otherUpdate = await fetch(`${otherSession.origin}/api/plays/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: otherCookie, Origin: otherSession.origin },
      body: JSON.stringify({ name: "Unauthorized update" }),
    });
    assert.equal(otherUpdate.status, 404, "Another account must not update the owner's play.");
    const otherDelete = await fetch(`${otherSession.origin}/api/plays/${created.id}`, {
      method: "DELETE",
      headers: { Cookie: otherCookie, Origin: otherSession.origin },
    });
    assert.equal(otherDelete.status, 404, "Another account must not delete the owner's play.");

    const ownerDelete = await fetch(`${otherSession.origin}/api/plays/${created.id}`, {
      method: "DELETE",
      headers: { Cookie: ownerCookie, Origin: otherSession.origin },
    });
    assert.equal(ownerDelete.status, 204, "The owner should be able to delete their play.");

    currentSubject = `auth-test-refreshed-${randomUUID()}`;
    testSubjects.push(currentSubject);
    currentExpirySeconds = 2;
    currentProvidesRefreshToken = true;
    const refreshCookie = await signIn(otherSession.origin);
    await new Promise((resolve) => setTimeout(resolve, 2300));
    const refreshedUser = await fetch(`${otherSession.origin}/api/auth/user`, {
      headers: { Cookie: refreshCookie },
    });
    assert.equal(
      (await refreshedUser.json() as { user: { id: string } | null }).user?.id,
      currentSubject,
      "A refresh token should renew an expired identity without losing the session.",
    );

    currentSubject = `auth-test-expired-${randomUUID()}`;
    testSubjects.push(currentSubject);
    currentExpirySeconds = 2;
    currentProvidesRefreshToken = false;
    const expiringCookie = await signIn(otherSession.origin);
    await new Promise((resolve) => setTimeout(resolve, 2300));
    const expiredUser = await fetch(`${otherSession.origin}/api/auth/user`, {
      headers: { Cookie: expiringCookie },
    });
    assert.deepEqual(
      await expiredUser.json(),
      { user: null, sessionExpired: true },
      "Expired provider sessions should resolve to a signed-out user.",
    );
    const expiredPlaybook = await fetch(`${otherSession.origin}/api/plays`, {
      headers: { Cookie: expiringCookie },
    });
    assert.equal(expiredPlaybook.status, 401, "Expired sessions must not access account plays.");

    const signOutResponse = await fetch(`${otherSession.origin}/api/logout`, {
      method: "POST",
      headers: { Cookie: otherCookie, Origin: otherSession.origin },
    });
    assert.equal(signOutResponse.status, 204);
    const signedOutUser = await fetch(`${otherSession.origin}/api/auth/user`, {
      headers: { Cookie: otherCookie },
    });
    assert.deepEqual(
      await signedOutUser.json(),
      { user: null, sessionExpired: false },
      "Logout must invalidate the session.",
    );

    console.log("Auth verification passed: PKCE/OIDC callback, persistent session, expiry, logout, CRUD, CSRF, and owner isolation.");
  } finally {
    if (activeServer) await close(activeServer);
    await close(providerServer);
    if (testSubjects.length) {
      const cleanupPool = new Pool({ connectionString: process.env.DATABASE_URL });
      try {
        await cleanupPool.query(
          "DELETE FROM sessions WHERE sess::text LIKE ANY($1::text[])",
          [testSubjects.map((subject) => `%${subject}%`)],
        );
        await cleanupPool.query(
          "DELETE FROM users WHERE auth_provider = 'replit' AND provider_subject = ANY($1::text[])",
          [testSubjects],
        );
      } finally {
        await cleanupPool.end();
      }
    }
  }
}

function emptyPlayData() {
  return {
    sport: "basketball",
    players: [],
    routes: [],
    freehandDrawings: [],
    textAnnotations: [],
    animationKeyframes: [],
    viewTransform: { x: 0, y: 0, scale: 1 },
  };
}

async function startApi(registerRoutes: typeof import("../server/routes").registerRoutes) {
  const app = express();
  app.use(express.json());
  const server = createServer(app);
  await registerRoutes(server, app);
  const port = await listen(server);
  return { app, server, origin: `http://127.0.0.1:${port}` };
}

async function signIn(origin: string): Promise<string> {
  let response = await fetch(`${origin}/api/login`, { redirect: "manual" });
  assert.equal(response.status, 302, "Login should begin with an OIDC authorization redirect.");
  const cookie = cookieFrom(response);
  const authorizationUrl = response.headers.get("location");
  assert.ok(authorizationUrl);

  response = await fetch(authorizationUrl, { redirect: "manual" });
  const providerResponse = await response.text();
  assert.equal(
    response.status,
    302,
    `The controlled provider should return an authorization code. Response: ${providerResponse}`,
  );
  const callbackUrl = response.headers.get("location");
  assert.ok(callbackUrl);
  assert.equal(new URL(callbackUrl).origin, origin, "The callback must return to the configured app origin.");
  response = await fetch(callbackUrl, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  assert.equal(response.status, 302, "The OIDC callback should establish an authenticated session.");
  assert.equal(response.headers.get("location"), "/app");
  const establishedCookie = cookieFrom(response, cookie);
  assert.ok(establishedCookie);
  return establishedCookie;
}

run().catch((error: unknown) => {
  console.error("Authentication verification failed:", error);
  process.exitCode = 1;
});

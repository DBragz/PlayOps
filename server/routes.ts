import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlaySchema } from "@shared/schema";
import type { Express, Request, RequestHandler } from "express";
import { getValidIdentity, requireAuthenticated, requireSameOrigin, setupAuth } from "./auth";

function authenticatedUserId(req: Request): string | undefined {
  return req.user?.claims?.sub;
}

const requireSameOriginMutation: RequestHandler = (req, res, next) => {
  if (requireSameOrigin(req, res)) next();
};

function planForUser(user: Awaited<ReturnType<typeof storage.getUser>>): "free" | "pro" {
  if (!user) return "free";
  if (user.manualPro) return "pro";
  if (!["active", "trialing"].includes(user.subscriptionStatus)) return "free";
  const periodEnd = user.subscriptionCurrentPeriodEnd?.getTime();
  return periodEnd === undefined || periodEnd > Date.now() ? "pro" : "free";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  configureAuthentication: (app: Express) => Promise<void> = setupAuth,
): Promise<Server> {
  await configureAuthentication(app);
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });

  app.get("/api/me", async (req, res, next) => {
    const hadAuthenticatedSession = req.isAuthenticated?.() === true;
    try {
      const identity = await getValidIdentity(req);
      if (!identity) {
        return res.json({
          user: null,
          plan: "free",
          sessionExpired: hadAuthenticatedSession,
        });
      }

      const user = await storage.getUser(identity.claims.sub);
      if (!user) {
        return res.status(500).json({ error: "Authenticated account was not found." });
      }
      res.json({
        user: { id: user.id, username: user.username, email: user.email },
        plan: planForUser(user),
        sessionExpired: false,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/share/:token", async (req, res) => {
    try {
      const play = await storage.getPlayByShareToken(String(req.params.token));
      if (!play) return res.status(404).json({ error: "This play is no longer shared." });
      res.json({
        id: play.id,
        name: play.name,
        description: play.description,
        sport: play.sport,
        tags: play.tags,
        data: play.data,
        createdAt: play.createdAt,
        updatedAt: play.updatedAt,
      });
    } catch (error) {
      console.error("Error fetching shared play:", error);
      res.status(500).json({ error: "Failed to fetch shared play." });
    }
  });

  app.get("/api/plays", requireAuthenticated, async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const plays = await storage.getPlays(userId);
      res.json(plays);
    } catch (error) {
      console.error("Error fetching plays:", error);
      res.status(500).json({ error: "Failed to fetch plays" });
    }
  });

  // Get a single play by ID
  app.get("/api/plays/:id", requireAuthenticated, async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const play = await storage.getPlay(String(req.params.id), userId);
      if (!play) {
        return res.status(404).json({ error: "Play not found" });
      }
      res.json(play);
    } catch (error) {
      console.error("Error fetching play:", error);
      res.status(500).json({ error: "Failed to fetch play" });
    }
  });

  // Create a new play
  app.post("/api/plays", requireAuthenticated, requireSameOriginMutation, async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const parsed = insertPlaySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid play data", details: parsed.error.issues });
      }
      const play = await storage.createPlay(parsed.data, userId);
      res.status(201).json(play);
    } catch (error) {
      console.error("Error creating play:", error);
      res.status(500).json({ error: "Failed to create play" });
    }
  });

  // Update a play
  app.patch("/api/plays/:id", requireAuthenticated, requireSameOriginMutation, async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const updateSchema = insertPlaySchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid play data", details: parsed.error.issues });
      }
      const play = await storage.updatePlay(String(req.params.id), parsed.data, userId);
      if (!play) {
        return res.status(404).json({ error: "Play not found" });
      }
      res.json(play);
    } catch (error) {
      console.error("Error updating play:", error);
      res.status(500).json({ error: "Failed to update play" });
    }
  });

  // Delete a play
  app.delete("/api/plays/:id", requireAuthenticated, requireSameOriginMutation, async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const deleted = await storage.deletePlay(String(req.params.id), userId);
      if (!deleted) {
        return res.status(404).json({ error: "Play not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting play:", error);
      res.status(500).json({ error: "Failed to delete play" });
    }
  });

  app.post("/api/plays/:id/share", requireAuthenticated, requireSameOriginMutation, async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const user = await storage.getUser(userId);
      if (!user || planForUser(user) !== "pro") {
        return res.status(403).json({ error: "Play sharing requires PlayOps Pro.", code: "PRO_REQUIRED" });
      }

      const play = await storage.createPlayShareToken(String(req.params.id), userId);
      if (!play) return res.status(404).json({ error: "Play not found." });
      if (!play.shareToken) return res.status(500).json({ error: "Could not create a share link." });
      res.json({ shareToken: play.shareToken });
    } catch (error) {
      console.error("Error sharing play:", error);
      res.status(500).json({ error: "Failed to share play." });
    }
  });

  app.delete("/api/plays/:id/share", requireAuthenticated, requireSameOriginMutation, async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const play = await storage.clearPlayShareToken(String(req.params.id), userId);
      if (!play) return res.status(404).json({ error: "Play not found." });
      res.status(204).end();
    } catch (error) {
      console.error("Error stopping play share:", error);
      res.status(500).json({ error: "Failed to stop sharing play." });
    }
  });

  return httpServer;
}

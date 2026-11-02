import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlaySchema } from "@shared/schema";
import type { Request } from "express";

interface ReplitAuthenticatedRequest extends Request {
  user?: { claims?: { sub?: string } };
  isAuthenticated?: () => boolean;
}

function authenticatedUserId(req: Request): string | undefined {
  const authenticatedRequest = req as ReplitAuthenticatedRequest;
  if (authenticatedRequest.isAuthenticated?.() !== true) return undefined;
  return authenticatedRequest.user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // The Replit Auth middleware must populate req.user before these routes are usable.
  app.get("/api/plays", async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      const plays = await storage.getPlays(userId);
      res.json(plays);
    } catch (error) {
      console.error("Error fetching plays:", error);
      res.status(500).json({ error: "Failed to fetch plays" });
    }
  });

  // Get a single play by ID
  app.get("/api/plays/:id", async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      const play = await storage.getPlay(req.params.id, userId);
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
  app.post("/api/plays", async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required" });
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
  app.patch("/api/plays/:id", async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      const updateSchema = insertPlaySchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid play data", details: parsed.error.issues });
      }
      const play = await storage.updatePlay(req.params.id, parsed.data, userId);
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
  app.delete("/api/plays/:id", async (req, res) => {
    try {
      const userId = authenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      const deleted = await storage.deletePlay(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Play not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting play:", error);
      res.status(500).json({ error: "Failed to delete play" });
    }
  });

  return httpServer;
}

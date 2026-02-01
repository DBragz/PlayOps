import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlaySchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all plays
  app.get("/api/plays", async (req, res) => {
    try {
      const plays = await storage.getPlays();
      res.json(plays);
    } catch (error) {
      console.error("Error fetching plays:", error);
      res.status(500).json({ error: "Failed to fetch plays" });
    }
  });

  // Get a single play by ID
  app.get("/api/plays/:id", async (req, res) => {
    try {
      const play = await storage.getPlay(req.params.id);
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
      const parsed = insertPlaySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid play data", details: parsed.error.issues });
      }
      const play = await storage.createPlay(parsed.data);
      res.status(201).json(play);
    } catch (error) {
      console.error("Error creating play:", error);
      res.status(500).json({ error: "Failed to create play" });
    }
  });

  // Update a play
  app.patch("/api/plays/:id", async (req, res) => {
    try {
      const updateSchema = insertPlaySchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid play data", details: parsed.error.issues });
      }
      const play = await storage.updatePlay(req.params.id, parsed.data);
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
      const deleted = await storage.deletePlay(req.params.id);
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

import { type User, type InsertUser, type Play, type InsertPlay } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Plays CRUD operations
  getPlays(): Promise<Play[]>;
  getPlay(id: string): Promise<Play | undefined>;
  createPlay(play: InsertPlay): Promise<Play>;
  updatePlay(id: string, play: Partial<InsertPlay>): Promise<Play | undefined>;
  deletePlay(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private plays: Map<string, Play>;

  constructor() {
    this.users = new Map();
    this.plays = new Map();
    this.seedPlays();
  }

  private seedPlays() {
    const samplePlays: Play[] = [
      {
        id: randomUUID(),
        name: "Pick and Roll",
        description: "Classic basketball play",
        sport: "basketball",
        tags: ["offense", "basic"],
        data: {
          sport: "basketball",
          players: [
            { id: "p1", number: "1", teamColor: "#FF6B00", position: { x: 600, y: 500 }, size: 40 },
            { id: "p2", number: "2", teamColor: "#FF6B00", position: { x: 500, y: 400 }, size: 40 },
            { id: "p3", number: "3", teamColor: "#1E3A5F", position: { x: 650, y: 450 }, size: 40 },
          ],
          routes: [],
          freehandDrawings: [],
          textAnnotations: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Zone Defense",
        description: "2-3 zone defensive formation",
        sport: "basketball",
        tags: ["defense", "zone"],
        data: {
          sport: "basketball",
          players: [
            { id: "p1", number: "1", teamColor: "#1E3A5F", position: { x: 450, y: 300 }, size: 40 },
            { id: "p2", number: "2", teamColor: "#1E3A5F", position: { x: 750, y: 300 }, size: 40 },
            { id: "p3", number: "3", teamColor: "#1E3A5F", position: { x: 350, y: 450 }, size: 40 },
            { id: "p4", number: "4", teamColor: "#1E3A5F", position: { x: 600, y: 450 }, size: 40 },
            { id: "p5", number: "5", teamColor: "#1E3A5F", position: { x: 850, y: 450 }, size: 40 },
          ],
          routes: [],
          freehandDrawings: [],
          textAnnotations: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Quick Sync Attack",
        description: "Fast volleyball attack from setter",
        sport: "volleyball",
        tags: ["offense", "quick"],
        data: {
          sport: "volleyball",
          players: [
            { id: "p1", number: "1", teamColor: "#FF6B00", position: { x: 400, y: 400 }, size: 40 },
            { id: "p2", number: "2", teamColor: "#FF6B00", position: { x: 600, y: 350 }, size: 40 },
            { id: "p3", number: "3", teamColor: "#FF6B00", position: { x: 500, y: 500 }, size: 40 },
          ],
          routes: [],
          freehandDrawings: [],
          textAnnotations: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    samplePlays.forEach((play) => this.plays.set(play.id, play));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPlays(): Promise<Play[]> {
    return Array.from(this.plays.values()).sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getPlay(id: string): Promise<Play | undefined> {
    return this.plays.get(id);
  }

  async createPlay(insertPlay: InsertPlay): Promise<Play> {
    const id = randomUUID();
    const now = new Date();
    const play: Play = {
      id,
      name: insertPlay.name,
      description: insertPlay.description ?? null,
      sport: insertPlay.sport,
      tags: insertPlay.tags ?? null,
      data: insertPlay.data,
      createdAt: now,
      updatedAt: now,
    };
    this.plays.set(id, play);
    return play;
  }

  async updatePlay(id: string, updates: Partial<InsertPlay>): Promise<Play | undefined> {
    const existing = this.plays.get(id);
    if (!existing) return undefined;

    const updated: Play = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.plays.set(id, updated);
    return updated;
  }

  async deletePlay(id: string): Promise<boolean> {
    return this.plays.delete(id);
  }
}

export const storage = new MemStorage();

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { type User, type InsertUser, type Play, type InsertPlay, plays, users } from "@shared/schema";
import { createHash, randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertReplitUser(profile: { subject: string; email: string | null }): Promise<User>;
  
  // Plays CRUD operations
  getPlays(userId: string): Promise<Play[]>;
  getPlay(id: string, userId: string): Promise<Play | undefined>;
  createPlay(play: InsertPlay, userId: string): Promise<Play>;
  updatePlay(id: string, play: Partial<InsertPlay>, userId: string): Promise<Play | undefined>;
  deletePlay(id: string, userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private plays: Map<string, Play>;

  constructor() {
    this.users = new Map();
    this.plays = new Map();
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
    const user: User = {
      ...insertUser,
      password: insertUser.password ?? null,
      id,
      email: null,
      authProvider: null,
      providerSubject: null,
      stripeCustomerId: null,
      subscriptionStatus: "free",
      subscriptionCurrentPeriodEnd: null,
      manualPro: false,
    };
    this.users.set(id, user);
    return user;
  }

  async upsertReplitUser(profile: { subject: string; email: string | null }): Promise<User> {
    const existing = Array.from(this.users.values()).find(
      (user) => user.authProvider === "replit" && user.providerSubject === profile.subject,
    );
    if (existing) {
      const updated = { ...existing, email: profile.email };
      this.users.set(updated.id, updated);
      return updated;
    }

    const id = randomUUID();
    const username = `replit_${createHash("sha256").update(profile.subject).digest("hex")}`;
    const user: User = {
      id,
      username,
      password: null,
      email: profile.email,
      authProvider: "replit",
      providerSubject: profile.subject,
      stripeCustomerId: null,
      subscriptionStatus: "free",
      subscriptionCurrentPeriodEnd: null,
      manualPro: false,
    };
    this.users.set(id, user);
    return user;
  }

  async getPlays(userId: string): Promise<Play[]> {
    return Array.from(this.plays.values()).filter((play) => play.userId === userId).sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getPlay(id: string, userId: string): Promise<Play | undefined> {
    const play = this.plays.get(id);
    return play?.userId === userId ? play : undefined;
  }

  async createPlay(insertPlay: InsertPlay, userId: string): Promise<Play> {
    const id = randomUUID();
    const now = new Date();
    const play: Play = {
      id,
      userId,
      name: insertPlay.name,
      description: insertPlay.description ?? null,
      sport: insertPlay.sport,
      tags: insertPlay.tags ?? null,
      data: insertPlay.data,
      shareToken: null,
      createdAt: now,
      updatedAt: now,
    };
    this.plays.set(id, play);
    return play;
  }

  async updatePlay(id: string, updates: Partial<InsertPlay>, userId: string): Promise<Play | undefined> {
    const existing = this.plays.get(id);
    if (!existing || existing.userId !== userId) return undefined;

    const updated: Play = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.plays.set(id, updated);
    return updated;
  }

  async deletePlay(id: string, userId: string): Promise<boolean> {
    const existing = this.plays.get(id);
    return !!existing && existing.userId === userId && this.plays.delete(id);
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { plays, users } });

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async upsertReplitUser(profile: { subject: string; email: string | null }): Promise<User> {
    const username = `replit_${createHash("sha256").update(profile.subject).digest("hex")}`;
    const [user] = await db.insert(users).values({
      username,
      password: null,
      email: profile.email,
      authProvider: "replit",
      providerSubject: profile.subject,
    }).onConflictDoUpdate({
      target: [users.authProvider, users.providerSubject],
      set: { email: profile.email },
    }).returning();
    return user;
  }

  async getPlays(userId: string): Promise<Play[]> {
    return db.select().from(plays).where(eq(plays.userId, userId)).orderBy(desc(plays.updatedAt));
  }

  async getPlay(id: string, userId: string): Promise<Play | undefined> {
    const [play] = await db.select().from(plays)
      .where(and(eq(plays.id, id), eq(plays.userId, userId))).limit(1);
    return play;
  }

  async createPlay(play: InsertPlay, userId: string): Promise<Play> {
    const [created] = await db.insert(plays).values({ ...play, userId }).returning();
    return created;
  }

  async updatePlay(id: string, updates: Partial<InsertPlay>, userId: string): Promise<Play | undefined> {
    const [updated] = await db.update(plays)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(plays.id, id), eq(plays.userId, userId))).returning();
    return updated;
  }

  async deletePlay(id: string, userId: string): Promise<boolean> {
    const deleted = await db.delete(plays)
      .where(and(eq(plays.id, id), eq(plays.userId, userId))).returning({ id: plays.id });
    return deleted.length > 0;
  }
}

export const storage = new DatabaseStorage();

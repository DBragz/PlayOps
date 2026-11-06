import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { type User, type InsertUser, type Play, type InsertPlay, plays, users } from "@shared/schema";
import { createHash, randomBytes, randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertReplitUser(profile: { subject: string; username: string; email: string | null }): Promise<User>;
  
  // Plays CRUD operations
  getPlays(userId: string): Promise<Play[]>;
  getPlay(id: string, userId: string): Promise<Play | undefined>;
  createPlay(play: InsertPlay, userId: string): Promise<Play>;
  updatePlay(id: string, play: Partial<InsertPlay>, userId: string): Promise<Play | undefined>;
  deletePlay(id: string, userId: string): Promise<boolean>;
  getPlayByShareToken(token: string): Promise<Play | undefined>;
  createPlayShareToken(id: string, userId: string): Promise<Play | undefined>;
  clearPlayShareToken(id: string, userId: string): Promise<Play | undefined>;
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

  async upsertReplitUser(profile: { subject: string; username: string; email: string | null }): Promise<User> {
    const existing = Array.from(this.users.values()).find(
      (user) => user.authProvider === "replit" && user.providerSubject === profile.subject,
    );
    if (existing) {
      const updated = { ...existing, username: uniqueReplitUsername(profile), email: profile.email };
      this.users.set(updated.id, updated);
      return updated;
    }

    const id = profile.subject;
    const username = uniqueReplitUsername(profile);
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

  async getPlayByShareToken(token: string): Promise<Play | undefined> {
    return Array.from(this.plays.values()).find((play) => play.shareToken === token);
  }

  async createPlayShareToken(id: string, userId: string): Promise<Play | undefined> {
    const existing = await this.getPlay(id, userId);
    if (!existing) return undefined;
    if (existing.shareToken) return existing;

    const updated: Play = {
      ...existing,
      shareToken: randomBytes(32).toString("base64url"),
      updatedAt: new Date(),
    };
    this.plays.set(id, updated);
    return updated;
  }

  async clearPlayShareToken(id: string, userId: string): Promise<Play | undefined> {
    const existing = await this.getPlay(id, userId);
    if (!existing) return undefined;
    const updated: Play = { ...existing, shareToken: null, updatedAt: new Date() };
    this.plays.set(id, updated);
    return updated;
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

  async upsertReplitUser(profile: { subject: string; username: string; email: string | null }): Promise<User> {
    const username = uniqueReplitUsername(profile);
    const [user] = await db.insert(users).values({
      id: profile.subject,
      username,
      password: null,
      email: profile.email,
      authProvider: "replit",
      providerSubject: profile.subject,
    }).onConflictDoUpdate({
      target: [users.authProvider, users.providerSubject],
      set: { id: profile.subject, username, email: profile.email },
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

  async getPlayByShareToken(token: string): Promise<Play | undefined> {
    const [play] = await db.select().from(plays).where(eq(plays.shareToken, token)).limit(1);
    return play;
  }

  async createPlayShareToken(id: string, userId: string): Promise<Play | undefined> {
    const existing = await this.getPlay(id, userId);
    if (!existing) return undefined;
    if (existing.shareToken) return existing;

    const [updated] = await db.update(plays)
      .set({ shareToken: randomBytes(32).toString("base64url"), updatedAt: new Date() })
      .where(and(eq(plays.id, id), eq(plays.userId, userId), isNull(plays.shareToken)))
      .returning();
    return updated ?? this.getPlay(id, userId);
  }

  async clearPlayShareToken(id: string, userId: string): Promise<Play | undefined> {
    const [updated] = await db.update(plays)
      .set({ shareToken: null, updatedAt: new Date() })
      .where(and(eq(plays.id, id), eq(plays.userId, userId)))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();

function uniqueReplitUsername(profile: { subject: string; username: string }): string {
  const base = profile.username
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "replit_user";
  const suffix = createHash("sha256").update(profile.subject).digest("hex").slice(0, 10);
  return `${base}_${suffix}`;
}

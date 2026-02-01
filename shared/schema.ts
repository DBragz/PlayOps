import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Player position on the field
export const playerPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type PlayerPosition = z.infer<typeof playerPositionSchema>;

// Player object on the field
export const playerObjectSchema = z.object({
  id: z.string(),
  number: z.string(),
  label: z.string().optional(),
  teamColor: z.string(),
  position: playerPositionSchema,
  size: z.number().default(40),
});

export type PlayerObject = z.infer<typeof playerObjectSchema>;

// Route point for drawing paths
export const routePointSchema = z.object({
  x: z.number(),
  y: z.number(),
  controlPoint1: playerPositionSchema.optional(),
  controlPoint2: playerPositionSchema.optional(),
});

export type RoutePoint = z.infer<typeof routePointSchema>;

// Route/path drawn on the field
export const routeSchema = z.object({
  id: z.string(),
  playerId: z.string().optional(),
  points: z.array(routePointSchema),
  color: z.string(),
  strokeWidth: z.number().default(3),
  lineType: z.enum(["solid", "dashed", "dotted"]).default("solid"),
  hasArrow: z.boolean().default(true),
  isCurved: z.boolean().default(false),
});

export type Route = z.infer<typeof routeSchema>;

// Freehand drawing
export const freehandDrawingSchema = z.object({
  id: z.string(),
  points: z.array(z.number()),
  color: z.string(),
  strokeWidth: z.number().default(2),
});

export type FreehandDrawing = z.infer<typeof freehandDrawingSchema>;

// Text annotation
export const textAnnotationSchema = z.object({
  id: z.string(),
  text: z.string(),
  position: playerPositionSchema,
  fontSize: z.number().default(16),
  color: z.string(),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
});

export type TextAnnotation = z.infer<typeof textAnnotationSchema>;

// Sport types
export const sportTypes = ["basketball", "football", "soccer", "volleyball", "hockey", "baseball", "custom"] as const;
export type SportType = typeof sportTypes[number];

// Animation keyframe for a player
export const animationKeyframeSchema = z.object({
  playerId: z.string(),
  time: z.number(),
  position: playerPositionSchema,
});

export type AnimationKeyframe = z.infer<typeof animationKeyframeSchema>;

// Complete play data
export const playDataSchema = z.object({
  sport: z.enum(sportTypes),
  players: z.array(playerObjectSchema),
  routes: z.array(routeSchema),
  freehandDrawings: z.array(freehandDrawingSchema),
  textAnnotations: z.array(textAnnotationSchema),
  animationKeyframes: z.array(animationKeyframeSchema).optional(),
  viewTransform: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
  }).optional(),
});

export type PlayData = z.infer<typeof playDataSchema>;

// Database table for plays
export const plays = pgTable("plays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sport: text("sport").notNull(),
  tags: text("tags").array(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlaySchema = createInsertSchema(plays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlay = z.infer<typeof insertPlaySchema>;
export type Play = typeof plays.$inferSelect;

// Users table (kept for future use)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

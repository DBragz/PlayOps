import type { PlayData, SportType } from "@shared/schema";

export interface PlayTemplate {
  id: string;
  name: string;
  description: string;
  sport: SportType;
  tags: string[];
  data: PlayData;
}

export const STARTER_TEMPLATES: PlayTemplate[] = [
  {
    id: "starter-pick-and-roll",
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
      animationKeyframes: [],
      viewTransform: { x: 0, y: 0, scale: 1 },
    },
  },
  {
    id: "starter-zone-defense",
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
      animationKeyframes: [],
      viewTransform: { x: 0, y: 0, scale: 1 },
    },
  },
  {
    id: "starter-quick-sync-attack",
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
      animationKeyframes: [],
      viewTransform: { x: 0, y: 0, scale: 1 },
    },
  },
];

import { v4 as uuidv4 } from "uuid";
import type { PlayData, PlayerObject, Route, FreehandDrawing, TextAnnotation, SportType } from "@shared/schema";

const STORAGE_KEY = "playops-plays";

// Client-side Play type that uses string dates for localStorage compatibility
export interface ClientPlay {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  tags: string[] | null;
  data: PlayData;
  createdAt: string;
  updatedAt: string;
}

export interface PlayStore {
  plays: ClientPlay[];
  currentPlayId: string | null;
}

function getDefaultPlayData(sport: SportType = "basketball"): PlayData {
  return {
    sport,
    players: [],
    routes: [],
    freehandDrawings: [],
    textAnnotations: [],
    animationKeyframes: [],
    viewTransform: { x: 0, y: 0, scale: 1 },
  };
}

export function loadPlays(): ClientPlay[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as ClientPlay[];
    }
  } catch (e) {
    console.error("Failed to load plays from localStorage:", e);
  }
  return [];
}

export function savePlays(plays: ClientPlay[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
  } catch (e) {
    console.error("Failed to save plays to localStorage:", e);
  }
}

export function createPlay(name: string, sport: SportType = "basketball"): ClientPlay {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    description: null,
    sport,
    tags: [],
    data: getDefaultPlayData(sport),
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicatePlay(play: ClientPlay): ClientPlay {
  const now = new Date().toISOString();
  return {
    ...play,
    id: uuidv4(),
    name: `${play.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };
}

export function updatePlayData(play: ClientPlay, data: Partial<PlayData>): ClientPlay {
  return {
    ...play,
    data: { ...play.data, ...data },
    updatedAt: new Date().toISOString(),
  };
}

export function createPlayer(teamColor: string, number: string, position: { x: number; y: number }): PlayerObject {
  return {
    id: uuidv4(),
    number,
    teamColor,
    position,
    size: 40,
  };
}

export function createRoute(playerId: string | undefined, color: string, startPoint: { x: number; y: number }): Route {
  return {
    id: uuidv4(),
    playerId,
    points: [{ x: startPoint.x, y: startPoint.y }],
    color,
    strokeWidth: 3,
    lineType: "solid",
    hasArrow: true,
    isCurved: false,
  };
}

export function createFreehandDrawing(color: string): FreehandDrawing {
  return {
    id: uuidv4(),
    points: [],
    color,
    strokeWidth: 2,
  };
}

export function createTextAnnotation(text: string, position: { x: number; y: number }, color: string): TextAnnotation {
  return {
    id: uuidv4(),
    text,
    position,
    fontSize: 16,
    color,
    fontWeight: "normal",
  };
}

// Team colors for both teams
export const teamColors = {
  team1: ["#FF6B00", "#FF8C38", "#E65100"],
  team2: ["#1E3A5F", "#2E5A8F", "#0D1F33"],
  neutral: ["#4CAF50", "#2196F3", "#9C27B0"],
};

// Default player numbers by sport
export const defaultPlayerNumbers: Record<SportType, string[]> = {
  basketball: ["1", "2", "3", "4", "5"],
  football: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
  soccer: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
  volleyball: ["1", "2", "3", "4", "5", "6"],
  hockey: ["1", "2", "3", "4", "5", "6"],
  baseball: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  custom: ["1", "2", "3", "4", "5"],
};

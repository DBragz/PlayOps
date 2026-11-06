import { v4 as uuidv4 } from "uuid";
import type { PlayData, PlayerObject, Route, FreehandDrawing, TextAnnotation, SportType } from "@shared/schema";
import { apiRequest } from "./queryClient";

const STORAGE_KEY = "playops-plays";
const LOCAL_IMPORT_KEY_PREFIX = "playops-local-import:";
const STARTER_SEED_KEY_PREFIX = "playops-templates-seeded:";

export interface LocalPlayImportProgress {
  importedPlayIds: string[];
  dismissed: boolean;
  completed: boolean;
}

// Client-side Play type that uses string dates for localStorage compatibility
export interface ClientPlay {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  tags: string[] | null;
  shareToken?: string | null;
  data: PlayData;
  createdAt: string;
  updatedAt: string;
}

export interface PlayStore {
  plays: ClientPlay[];
  currentPlayId: string | null;
}

export interface AccountUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

export type AccountPlan = "free" | "pro";

export interface AccountPlanResponse {
  user: { id: string; username: string; email: string | null } | null;
  plan: AccountPlan;
  sessionExpired?: boolean;
}

function toClientPlay(play: {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  tags: string[] | null;
  shareToken?: string | null;
  data: PlayData;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}): ClientPlay {
  const now = new Date().toISOString();
  return {
    id: play.id,
    name: play.name,
    description: play.description,
    sport: play.sport,
    tags: play.tags,
    shareToken: play.shareToken ?? null,
    data: play.data,
    createdAt: play.createdAt ? new Date(play.createdAt).toISOString() : now,
    updatedAt: play.updatedAt ? new Date(play.updatedAt).toISOString() : now,
  };
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<AccountUser | null> {
  const response = await fetch("/api/auth/user", { credentials: "include", signal });
  if (!response.ok) throw new Error("Could not check your sign-in status.");
  const result = await response.json() as { user: AccountUser | null; sessionExpired?: boolean };
  if (result.sessionExpired) throw new Error("AUTH_SESSION_EXPIRED");
  return result.user;
}

export async function fetchCurrentPlan(signal?: AbortSignal): Promise<AccountPlanResponse> {
  const response = await fetch("/api/me", { credentials: "include", signal });
  if (!response.ok) throw new Error("Could not load your PlayOps plan.");
  const result = await response.json() as AccountPlanResponse;
  if (result.sessionExpired) throw new Error("AUTH_SESSION_EXPIRED");
  if (result.plan !== "free" && result.plan !== "pro") {
    throw new Error("The server returned an invalid PlayOps plan.");
  }
  return result;
}

export async function fetchAccountPlays(signal?: AbortSignal): Promise<ClientPlay[]> {
  const response = await apiRequest("GET", "/api/plays", undefined, signal);
  const plays = await response.json() as Parameters<typeof toClientPlay>[0][];
  return plays.map(toClientPlay);
}

export async function createAccountPlay(play: ClientPlay, signal?: AbortSignal): Promise<ClientPlay> {
  const response = await apiRequest("POST", "/api/plays", {
    name: play.name,
    description: play.description,
    sport: play.sport,
    tags: play.tags,
    data: play.data,
  }, signal);
  return toClientPlay(await response.json() as Parameters<typeof toClientPlay>[0]);
}

export async function updateAccountPlay(
  id: string,
  changes: Partial<Pick<ClientPlay, "name" | "description" | "sport" | "tags" | "data">>,
  signal?: AbortSignal,
): Promise<ClientPlay> {
  const response = await apiRequest("PATCH", `/api/plays/${encodeURIComponent(id)}`, changes, signal);
  return toClientPlay(await response.json() as Parameters<typeof toClientPlay>[0]);
}

export async function deleteAccountPlay(id: string, signal?: AbortSignal): Promise<void> {
  await apiRequest("DELETE", `/api/plays/${encodeURIComponent(id)}`, undefined, signal);
}

export async function createAccountPlayShareToken(id: string, signal?: AbortSignal): Promise<string> {
  const response = await apiRequest("POST", `/api/plays/${encodeURIComponent(id)}/share`, {}, signal);
  const result = await response.json() as { shareToken?: string };
  if (!result.shareToken) throw new Error("The server did not return a share link.");
  return result.shareToken;
}

export async function stopAccountPlaySharing(id: string, signal?: AbortSignal): Promise<void> {
  await apiRequest("DELETE", `/api/plays/${encodeURIComponent(id)}/share`, undefined, signal);
}

export async function fetchSharedPlay(token: string, signal?: AbortSignal): Promise<ClientPlay> {
  const response = await fetch(`/api/share/${encodeURIComponent(token)}`, {
    credentials: "omit",
    signal,
  });
  if (response.status === 404) throw new Error("SHARE_NOT_FOUND");
  if (!response.ok) throw new Error("Could not load this shared play.");
  return toClientPlay(await response.json() as Parameters<typeof toClientPlay>[0]);
}

export async function copyShareLink(link: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(link);
    return;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = link;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    if (!copied) throw new Error("Could not copy share link.");
  }
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

export function loadLocalPlayImportProgress(userId: string): LocalPlayImportProgress {
  try {
    const stored = localStorage.getItem(`${LOCAL_IMPORT_KEY_PREFIX}${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<LocalPlayImportProgress>;
      return {
        importedPlayIds: Array.isArray(parsed.importedPlayIds) ? parsed.importedPlayIds : [],
        dismissed: parsed.dismissed === true,
        completed: parsed.completed === true,
      };
    }
  } catch (e) {
    console.error("Failed to load local play import progress:", e);
  }
  return { importedPlayIds: [], dismissed: false, completed: false };
}

export function saveLocalPlayImportProgress(userId: string, progress: LocalPlayImportProgress): void {
  try {
    localStorage.setItem(`${LOCAL_IMPORT_KEY_PREFIX}${userId}`, JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save local play import progress:", e);
  }
}

export function areStarterTemplatesSeeded(userId: string): boolean {
  try {
    return localStorage.getItem(`${STARTER_SEED_KEY_PREFIX}${userId}`) === "done";
  } catch {
    return false;
  }
}

export function markStarterTemplatesSeeded(userId: string): void {
  try {
    localStorage.setItem(`${STARTER_SEED_KEY_PREFIX}${userId}`, "done");
  } catch (e) {
    console.error("Failed to save starter template import status:", e);
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

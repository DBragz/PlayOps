import type { PlayData } from "@shared/schema";

export interface HistoryState {
  past: PlayData[];
  present: PlayData;
  future: PlayData[];
}

export function createHistoryState(initial: PlayData): HistoryState {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function pushState(history: HistoryState, newState: PlayData): HistoryState {
  return {
    past: [...history.past, history.present].slice(-50), // Keep last 50 states
    present: newState,
    future: [],
  };
}

export function undo(history: HistoryState): HistoryState {
  if (history.past.length === 0) return history;

  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);

  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(history: HistoryState): HistoryState {
  if (history.future.length === 0) return history;

  const next = history.future[0];
  const newFuture = history.future.slice(1);

  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  };
}

export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0;
}

export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0;
}

// Client-side taste profiles & connections (kept in this browser).
import { useEffect, useState, useCallback } from "react";
import type { PersonT, TasteT } from "./rue.functions";
import { TasteProfileSchema, type GuestRoom } from "./chat-schemas";
import { sharedTasteProfile } from "./lifestyle";

export type Profile = PersonT & { city: string };
export type Connection = {
  id: string;
  label: string;
  profile: Profile;
  demo?: boolean;
  room?: GuestRoom;
  /** When this person joined your list, used to tell same-named people apart. */
  addedAt?: string;
  /** Canonical contact keys explicitly identified as other people by the owner. */
  differentFrom?: string[];
};

/** Ru may voice a demo partner's replies — never a real person's. */
export const canVoicePartner = (c: Pick<Connection, "demo">) => c.demo === true;

export type State = {
  me: Profile | null;
  connections: Connection[];
  activeId: string | null;
  pendingRoom?: GuestRoom | undefined;
  pendingInvite?: string | undefined;
  lastPlan?: unknown;
  lastChat?: { mood: string; scores: { a: number; b: number }; highlight: string };
  chats?: Record<string, SavedChat[]>;
  selectedChats?: Record<string, string | null>;
  memories?: Memory[];
  ruelette?: Record<string, unknown>;
  plans?: Record<string, unknown>;
  reveals?: Record<string, unknown>;
};
export type ChatMessage = { sender: "rue" | "a" | "b"; content: string };
export type SavedChat = {
  muted?: boolean;
  id: string;
  mood: string;
  messages: ChatMessage[];
  game: { type: string; prompt: string; options: string[] } | null;
  scores: { a: number; b: number };
  updatedAt: string;
  /** Message index where Ru's current fresh start begins; earlier messages stay visible. */
  resetAt?: number;
};

export function selectedChat(s: State, connectionId: string): SavedChat | undefined {
  // One thread per person: always resume the most recently updated one.
  const chats = s.chats?.[connectionId] ?? [];
  return [...chats].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).at(-1);
}

export function saveChat(s: State, connectionId: string, chat: SavedChat): State {
  const chats = s.chats?.[connectionId] ?? [];
  return {
    ...s,
    chats: { ...s.chats, [connectionId]: [...chats.filter((c) => c.id !== chat.id), chat] },
    selectedChats: { ...s.selectedChats, [connectionId]: chat.id },
  };
}
export type Memory = {
  id: string;
  connectionId: string;
  activity: string;
  milestone: string;
  rating: number;
  notes: string;
  commentary: string;
  at: string;
};

const KEY = "rendezvous.v1";
let storageKey = KEY;
const empty: State = { me: null, connections: [], activeId: null };

export const DEMO_A: Profile = {
  name: "Noor",
  city: "Chicago",
  tastes: [
    { category: "artist", label: "Erykah Badu" },
    { category: "artist", label: "Frank Ocean" },
    { category: "film", label: "In the Mood for Love" },
    { category: "film", label: "Chungking Express" },
    { category: "cuisine", label: "Omakase" },
    { category: "tv", label: "Insecure" },
  ],
};
export const DEMO_B: Profile = {
  name: "Theo",
  city: "Chicago",
  tastes: [
    { category: "artist", label: "Arctic Monkeys" },
    { category: "artist", label: "The Strokes" },
    { category: "film", label: "Spirited Away" },
    { category: "film", label: "Princess Mononoke" },
    { category: "cuisine", label: "Tacos" },
    { category: "tv", label: "The Bear" },
  ],
};

let mem: State = empty;
const subs = new Set<(s: State) => void>();
function load(): State {
  if (typeof window === "undefined") return empty;
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
  } catch {
    return empty;
  }
}
export function setState(fn: (s: State) => State) {
  const next = fn(mem);
  if (JSON.stringify(next) === JSON.stringify(mem)) return;
  mem = next;
  try { localStorage.setItem(storageKey, JSON.stringify(mem)); } catch { /* Account autosave still receives larger photo updates. */ }
  subs.forEach((f) => f(mem));
}

export function storeSnapshot() { return mem; }
export function subscribeStore(fn: (s: State) => void) { subs.add(fn); return () => { subs.delete(fn); }; }
export function switchAccountStore(userId: string | null, state?: State) {
  storageKey = userId ? `${KEY}.account.${userId}` : KEY;
  mem = state ?? load();
  try { localStorage.setItem(storageKey, JSON.stringify(mem)); } catch { /* Account owns the durable copy. */ }
  subs.forEach((fn) => fn(mem));
}

// Once an account session starts, the account owns the data; leftover guest-slot
// data would otherwise re-trigger the merge prompt on every later sign-in.
export function clearGuestStore() {
  try { localStorage.removeItem(KEY); } catch { /* Ignore storage errors. */ }
}

export function useStore() {
  const [s, set] = useState<State>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mem = load();
    set(mem);
    setReady(true);
    subs.add(set);
    return () => {
      subs.delete(set);
    };
  }, []);
  const active = s.connections.find((c) => c.id === s.activeId) ?? s.connections[0] ?? null;
  return { s, ready, active, update: useCallback(setState, []) };
}

export function startDemo() {
  setState((s) => ({
    ...s,
    me: s.me ?? DEMO_A,
    connections: [
      { id: "demo-theo", label: "partner", profile: DEMO_B, demo: true, addedAt: new Date().toISOString() },
      ...s.connections.filter((c) => c.id !== "demo-theo"),
    ],
    activeId: "demo-theo",
  }));
}

export const encodeInvite = (p: Profile) => btoa(unescape(encodeURIComponent(JSON.stringify(sharedTasteProfile(p)))));
export const decodeInvite = (d: string): Profile | null => {
  try {
    return sharedTasteProfile(TasteProfileSchema.parse(JSON.parse(decodeURIComponent(escape(atob(d))))));
  } catch {
    return null;
  }
};

export const CATEGORIES: { id: TasteT["category"]; label: string }[] = [
  { id: "artist", label: "Artists" },
  { id: "film", label: "Films" },
  { id: "tv", label: "Shows" },
  { id: "cuisine", label: "Cuisines" },
  { id: "restaurant", label: "Restaurants" },
  { id: "place", label: "Places" },
  { id: "book", label: "Books" },
  { id: "brand", label: "Brands" },
];

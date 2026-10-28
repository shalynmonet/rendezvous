// Client-side taste profiles & connections (kept in this browser).
import { useEffect, useState, useCallback } from "react";
import type { PersonT, TasteT } from "./rue.functions";
import { TasteProfileSchema, type GuestRoom } from "./chat-schemas";

export type Profile = PersonT & { city: string };
export type Connection = {
  id: string;
  label: string;
  profile: Profile;
  demo?: boolean;
  room?: GuestRoom;
};
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
};

export function selectedChat(s: State, connectionId: string): SavedChat | undefined {
  const chats = s.chats?.[connectionId] ?? [];
  const selected = s.selectedChats?.[connectionId];
  return selected === null ? undefined : chats.find((chat) => chat.id === selected) ?? chats.at(-1);
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
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return empty;
  }
}
export function setState(fn: (s: State) => State) {
  mem = fn(mem);
  localStorage.setItem(KEY, JSON.stringify(mem));
  subs.forEach((f) => f(mem));
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
      { id: "demo-theo", label: "partner", profile: DEMO_B, demo: true },
      ...s.connections.filter((c) => c.id !== "demo-theo"),
    ],
    activeId: "demo-theo",
  }));
}

export const encodeInvite = (p: Profile) => btoa(unescape(encodeURIComponent(JSON.stringify(p))));
export const decodeInvite = (d: string): Profile | null => {
  try {
    return TasteProfileSchema.parse(JSON.parse(decodeURIComponent(escape(atob(d)))));
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

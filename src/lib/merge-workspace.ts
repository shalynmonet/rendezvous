import type { State } from "./store";

// Invoked only after an explicit import choice. Retain non-overlapping account records.
export function mergeWorkspace(saved: State, local: State): State {
  const chats = { ...saved.chats };
  for (const [id, threads] of Object.entries(local.chats ?? {})) {
    chats[id] = [...threads, ...(chats[id] ?? []).filter((thread) => !threads.some((t) => t.id === thread.id))];
  }
  return {
    ...saved, ...local, me: local.me ?? saved.me,
    connections: [...local.connections, ...saved.connections.filter((c) => !local.connections.some((l) => l.id === c.id))],
    chats, selectedChats: { ...saved.selectedChats, ...local.selectedChats },
    memories: [...local.memories ?? [], ...(saved.memories ?? []).filter((m) => !(local.memories ?? []).some((l) => l.id === m.id))],
    plans: { ...saved.plans, ...local.plans }, reveals: { ...saved.reveals, ...local.reveals }, ruelette: { ...saved.ruelette, ...local.ruelette },
  };
}
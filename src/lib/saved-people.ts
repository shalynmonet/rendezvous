import type { AccountChat } from "./saved-chat-schemas";
import type { Connection, Profile } from "./store";

type SavedThread = { id: string; updatedAt: string; snapshot: AccountChat };
export type SavedPerson = { id: string; chatId: string; profile: Profile; updatedAt: string; addedAt: string };

// Saved snapshots identify people, never confer access to a live room.
export function savedPeople(chats: SavedThread[], me: Profile | null, local: Connection[]): SavedPerson[] {
  const people = new Map<string, SavedPerson>();
  const firstSeen = new Map<string, string>();
  for (const chat of chats) {
    const seen = firstSeen.get(chat.snapshot.sourceId);
    if (!seen || chat.updatedAt.localeCompare(seen) < 0) firstSeen.set(chat.snapshot.sourceId, chat.updatedAt);
  }
  for (const chat of [...chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    const snapshot = chat.snapshot;
    if (snapshot.kind === "demo" || !snapshot.b) continue;
    const id = snapshot.sourceId;
    if (people.has(id) || local.some((connection) => connection.id === id || `live:${connection.room?.id}` === id)) continue;
    const side = snapshot.ownerSide ?? (me && me.name === snapshot.b.name && me.name !== snapshot.a.name ? "b" : "a");
    const profile = side === "b" ? snapshot.a : snapshot.b;
    people.set(id, { id, chatId: chat.id, profile, updatedAt: chat.updatedAt, addedAt: firstSeen.get(id) ?? chat.updatedAt });
  }
  return [...people.values()];
}
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { chatAccess } from "@/lib/guest-chat.functions";
import { newGuestKey } from "@/lib/chat-schemas";
import { setState, useStore } from "@/lib/store";

/**
 * Creates one private invitation and follows it until the person joins: the
 * moment they do, they become a live connection on this device.
 */
export function useInvite() {
  const { s } = useStore();
  const access = useServerFn(chatAccess);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const create = async (): Promise<string | undefined> => {
    if (!s.me) return undefined;
    setBusy(true);
    try {
      const token = newGuestKey(),
        invite = newGuestKey();
      const r = await access({ data: { action: "create", token, invite, profile: s.me } });
      if (r.id) {
        setState((st) => ({ ...st, pendingRoom: { id: r.id as string, token, invite } }));
        return `${window.location.origin}/invite?i=${invite}`;
      }
      return undefined;
    } catch (e) {
      toast.error((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  // Poll an open invitation so the person turns live as soon as they accept.
  useEffect(() => {
    if (!s.pendingRoom) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const room = s.pendingRoom;
    const poll = async () => {
      try {
        const r = await access({ data: { action: "read", room: room.id, token: room.token } });
        if (!stopped && r.state?.b) {
          const partner = r.state.b;
          setState((st) => ({
            ...st,
            pendingRoom: undefined,
            connections: [
              ...st.connections.filter((c) => c.id !== room.id),
              { id: room.id, label: "live", profile: partner, room, addedAt: new Date().toISOString() },
            ],
            activeId: room.id,
          }));
          return;
        }
      } catch {
        if (!stopped) toast.error("Could not check your invitation. Try refreshing.");
        return;
      }
      if (!stopped) timer = setTimeout(poll, 2500);
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [s.pendingRoom, access]);

  return {
    busy,
    link: s.pendingRoom?.invite ? `${origin}/invite?i=${s.pendingRoom.invite}` : "",
    create,
  };
}

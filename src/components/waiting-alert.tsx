import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { roomPresence } from "@/lib/guest-chat.functions";
import { setState, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

/** Shows a banner when someone you share a live room with is sitting in it waiting for you. */
export function WaitingAlert() {
  const { s } = useStore();
  const check = useServerFn(roomPresence);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [waiting, setWaiting] = useState<{ id: string; name: string }[]>([]);
  const rooms = s.connections.filter((c) => c.room && !c.demo);
  const key = rooms.map((c) => c.room!.id).join(",");
  useEffect(() => {
    if (!rooms.length) return setWaiting([]);
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const found: { id: string; name: string }[] = [];
      for (const c of rooms) {
        try {
          const r = await check({ data: { room: c.room!.id, token: c.room!.token, here: false } });
          if (r.otherWaiting) found.push({ id: c.id, name: c.profile.name });
        } catch { /* room may have expired */ }
      }
      if (!stop) { setWaiting(found); t = setTimeout(poll, 15000); }
    };
    void poll();
    return () => { stop = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, check]);
  if (path === "/chat" || !waiting.length) return null;
  const w = waiting[0]!;
  return (
    <div role="status" className="border-b bg-secondary px-4 py-3 text-center text-secondary-foreground">
      <span className="font-display text-lg italic">{w.name} is waiting for you in chat.</span>{" "}
      <Button size="sm" className="ml-2" asChild onClick={() => setState((st) => ({ ...st, activeId: w.id }))}>
        <Link to="/chat">Join {w.name}</Link>
      </Button>
    </div>
  );
}

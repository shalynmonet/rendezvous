import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Page, PageTitle, RueSays } from "@/components/rue";
import { startDemo, useStore } from "@/lib/store";

import { useServerFn } from "@tanstack/react-start";
import { chatAccess } from "@/lib/guest-chat.functions";
import { newGuestKey } from "@/lib/chat-schemas";
import { ProfileShare } from "@/components/profile-share";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Your People — Rendezvous" },
      { name: "description", content: "Invite someone and let Rue compare your tastes." },
      { property: "og:title", content: "Your People — Rendezvous" },
      { property: "og:description", content: "Connections and invites." },
    ],
  }),
  component: Connections,
});

function Connections() {
  const { s, ready, active, update } = useStore();
  const access = useServerFn(chatAccess);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
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
          update((st) => ({
            ...st,
            pendingRoom: undefined,
            connections: [
              ...st.connections.filter((c) => c.id !== room.id),
              { id: room.id, label: "live", profile: partner, room },
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
  }, [s.pendingRoom, access, update]);
  const create = async () => {
    if (!s.me) return;
    setBusy(true);
    try {
      const token = newGuestKey(),
        invite = newGuestKey();
      const r = await access({ data: { action: "create", token, invite, profile: s.me } });
      if (r.id) update((st) => ({ ...st, pendingRoom: { id: r.id as string, token, invite } }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!ready) return null;
  const link = s.pendingRoom?.invite ? `${origin}/invite?i=${s.pendingRoom.invite}` : "";

  return (
    <Page>
      <PageTitle
        eyebrow="Your people"
        title="Connections"
        sub="Rue only ever looks at the two people in a pairing — never anyone else."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-luxe space-y-4 p-6">
          <h2 className="text-2xl font-semibold">Invite someone</h2>
          {s.me ? (
            <>
              {link ? (
                <>
                  <p role="status" className="text-sm text-gold">
                    Waiting for your person to join.
                  </p>
                  <ProfileShare link={link} name={s.me.name} />
                </>
              ) : (
                <Button disabled={busy} onClick={create}>
                  {busy ? "Creating invitation…" : "Create private chat invitation"}
                </Button>
              )}
            </>
          ) : (
            <Button asChild>
              <Link to="/profile">Build my profile first</Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (s.me) {
                update((st) => ({
                  ...st,
                  connections: [
                    ...st.connections.filter((c) => c.id !== "demo-theo"),
                    {
                      id: "demo-theo",
                      label: "partner",
                      profile: {
                        name: "Theo",
                        city: "Chicago",
                        tastes: [
                          { category: "artist", label: "Arctic Monkeys" },
                          { category: "film", label: "Spirited Away" },
                          { category: "tv", label: "The Bear" },
                        ],
                      },
                      demo: true,
                    },
                  ],
                  activeId: "demo-theo",
                }));
              } else startDemo();
            }}
          >
            Add the demo partner (Theo)
          </Button>
        </div>
        <div className="space-y-3">
          {!s.connections.length && <RueSays>No one yet. A fox can wait — briefly.</RueSays>}
          {s.connections.map((c) => (
            <div
              key={c.id}
              className={`card-luxe p-5 ${active?.id === c.id ? "border-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-2xl">
                    {c.profile.name} {c.demo && <span className="text-xs text-gold">demo</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.label} · {c.profile.tastes.length} tastes
                  </p>
                </div>
                {active?.id === c.id ? (
                  <span className="text-xs text-primary">Active</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update((st) => ({ ...st, activeId: c.id }))}
                  >
                    Select
                  </Button>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" asChild>
                  <Link to="/reveal" onClick={() => update((st) => ({ ...st, activeId: c.id }))}>
                    Taste Reveal
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/chat" onClick={() => update((st) => ({ ...st, activeId: c.id }))}>
                    Chat
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    update((st) => ({
                      ...st,
                      connections: st.connections.filter((x) => x.id !== c.id),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

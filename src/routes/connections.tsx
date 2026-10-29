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
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/components/account-provider";
import { listAccountChats } from "@/lib/saved-chat.functions";
import { readSavedProfile } from "@/lib/profile.functions";
import { savedPeople } from "@/lib/saved-people";
import { clashingNames, nameKey, personQualifier } from "@/lib/person-identity";
import { ErrorNote } from "@/components/rue";
import { PersonSeparation } from "@/components/person-separation";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Your People — Rendezvous" },
      { name: "description", content: "Invite someone and let Ru compare your tastes." },
      { property: "og:title", content: "Your People — Rendezvous" },
      { property: "og:description", content: "Connections and invites." },
    ],
  }),
  component: Connections,
});

function Connections() {
  const { s, ready, active, update } = useStore();
  const access = useServerFn(chatAccess);
  const { user } = useAccount();
  const readChats = useServerFn(listAccountChats);
  const readProfile = useServerFn(readSavedProfile);
  const accountChats = useQuery({ queryKey: ["account-chats", user?.id], queryFn: () => readChats(), enabled: !!user });
  const accountProfile = useQuery({ queryKey: ["account-profile", user?.id], queryFn: () => readProfile(), enabled: !!user });
  const people = savedPeople(user ? accountChats.data ?? [] : [], user ? accountProfile.data ?? s.me : s.me, s.connections);
  const clashes = clashingNames([...s.connections, ...people]);
  const candidates = [...s.connections, ...people.map((p) => ({ id: p.id, profile: p.profile, addedAt: p.addedAt, label: "saved" }))];
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
  }, [s.pendingRoom, access, update]);
  const create = async (): Promise<string | undefined> => {
    if (!s.me) return undefined;
    setBusy(true);
    try {
      const token = newGuestKey(),
        invite = newGuestKey();
      const r = await access({ data: { action: "create", token, invite, profile: s.me } });
      if (r.id) {
        update((st) => ({ ...st, pendingRoom: { id: r.id as string, token, invite } }));
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
  const inviteAgain = async (name: string) => {
    if (!s.me) { toast.info("Restore your saved tastes or create a profile before inviting someone."); return; }
    const url = s.pendingRoom?.invite ? `${origin}/invite?i=${s.pendingRoom.invite}` : await create();
    if (!url) return;
    try { await navigator.clipboard.writeText(url); toast.success(`Invite link copied — send it to ${name}!`); }
    catch { toast.info("Invite ready — copy or share it from the box above."); }
    document.getElementById("invite-card")?.scrollIntoView({ behavior: "smooth" });
  };
  if (!ready) return null;
  const link = s.pendingRoom?.invite ? `${origin}/invite?i=${s.pendingRoom.invite}` : "";

  return (
    <Page>
      <PageTitle
        eyebrow="Your people"
        title="Connections"
        sub="Ru only ever looks at the two people in a pairing — never anyone else."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div id="invite-card" className="card-luxe space-y-4 p-6">
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
                      addedAt: new Date().toISOString(),
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
          {user && accountChats.isPending && <p role="status">Loading your saved people…</p>}
          {user && accountChats.error && <ErrorNote msg={accountChats.error.message} />}
          {!s.connections.length && !people.length && (!user || !accountChats.isPending) && <RueSays>No one yet. A fox can wait — briefly.</RueSays>}
          {s.connections.map((c) => (
            <div
              key={c.id}
              className={`card-luxe p-5 ${active?.id === c.id ? "border-primary" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-2xl">
                    {c.profile.name}
                    {clashes.has(nameKey(c.profile.name)) && <span className="text-sm text-gold"> · {personQualifier(c.profile, { label: c.label, addedAt: c.addedAt })}</span>} {c.demo && <span className="text-xs text-gold">demo</span>}
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
              <div className="mt-3 flex flex-wrap gap-2">
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
                {c.room && <Button size="sm" variant="outline" asChild><Link to="/ru-lette" onClick={() => update((st) => ({ ...st, activeId: c.id }))}>Ru-lette</Link></Button>}
                {!c.room && !c.demo && <Button size="sm" variant="outline" disabled={busy} onClick={() => void inviteAgain(c.profile.name)}>Reconnect live</Button>}
                <PersonSeparation person={c} candidates={candidates} />
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
          {people.map((person) => (
            <div key={person.id} className="card-luxe space-y-3 p-5">
              <h2 className="font-display text-2xl">{person.profile.name}{clashes.has(nameKey(person.profile.name)) && <span className="text-sm text-gold"> · {personQualifier(person.profile, { addedAt: person.addedAt })}</span>}</h2>
              <p className="text-xs text-muted-foreground">Saved connection · {person.profile.tastes.length} tastes</p>
              <p className="text-sm text-muted-foreground">Your saved conversation is here. Live access is unavailable; share a link to reconnect.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild><Link to="/saved-chats" search={{ chat: person.chatId }}>Saved chats</Link></Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => {
                  if (!s.me) { toast.info("Restore your saved tastes or create a profile before inviting someone."); return; }
                  void inviteAgain(person.profile.name);
                }}>Reconnect live</Button>
                <PersonSeparation person={{ id: person.id, label: "saved", profile: person.profile, addedAt: person.addedAt }} candidates={candidates} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

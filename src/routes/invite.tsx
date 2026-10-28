import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Page, PageTitle, RueSays } from "@/components/rue";
import { decodeInvite, useStore, type Profile } from "@/lib/store";

export const Route = createFileRoute("/invite")({
  validateSearch: z.object({ d: z.string().optional() }),
  head: () => ({ meta: [{ title: "You're invited — Rendezvous" }, { name: "description", content: "Someone wants Rue to compare your tastes." }, { property: "og:title", content: "You're invited to a Rendezvous" }, { property: "og:description", content: "Accept and let Rue reveal what you share." }] }),
  component: Invite,
});

function Invite() {
  const { d } = Route.useSearch();
  const { s, ready, update } = useStore();
  const nav = useNavigate();
  const [p, setP] = useState<Profile | null>(null);
  useEffect(() => setP(d ? decodeInvite(d) : null), [d]);
  if (!ready) return null;
  if (!p) return <Page><RueSays>This invitation seems to have lost its envelope.</RueSays></Page>;

  const accept = () => {
    const id = `inv-${p.name}-${Date.now()}`;
    update((st) => ({ ...st, connections: [...st.connections, { id, label: "date", profile: p }], activeId: id }));
    nav({ to: s.me ? "/reveal" : "/profile" });
  };
  return (
    <Page>
      <PageTitle eyebrow="An invitation" title={`${p.name} wants a Rendezvous`} />
      <div className="card-luxe space-y-4 p-6">
        <RueSays>Bonsoir. {p.name} has excellent taste. Let's see if you do too.</RueSays>
        <Button onClick={accept}>Accept invitation</Button>
        {!s.me && <p className="text-sm text-muted-foreground">You'll build your taste profile next. <Link to="/profile" className="underline">Start now</Link></p>}
      </div>
    </Page>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Page, PageTitle, RueSays } from "@/components/rue";
import { encodeInvite, startDemo, useStore } from "@/lib/store";

export const Route = createFileRoute("/connections")({
  head: () => ({ meta: [{ title: "Your People — Rendezvous" }, { name: "description", content: "Invite someone and let Rue compare your tastes." }, { property: "og:title", content: "Your People — Rendezvous" }, { property: "og:description", content: "Connections and invites." }] }),
  component: Connections,
});

function Connections() {
  const { s, ready, active, update } = useStore();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!ready) return null;
  const link = s.me ? `${origin}/invite?d=${encodeInvite(s.me)}` : "";

  return (
    <Page>
      <PageTitle eyebrow="Your people" title="Connections" sub="Rue only ever looks at the two people in a pairing — never anyone else." />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-luxe space-y-4 p-6">
          <h2 className="text-2xl font-semibold">Invite someone</h2>
          {s.me ? (
            <>
              <p className="text-sm text-muted-foreground">Send this link. They build their tastes, and the pairing appears on both sides.</p>
              <code className="block truncate rounded bg-muted p-2 text-xs">{link}</code>
              <Button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied."); }}>Copy invite link</Button>
            </>
          ) : (
            <Button asChild><Link to="/profile">Build my profile first</Link></Button>
          )}
          <Button variant="outline" onClick={startDemo}>Add the demo partner (Theo)</Button>
        </div>
        <div className="space-y-3">
          {!s.connections.length && <RueSays>No one yet. A fox can wait — briefly.</RueSays>}
          {s.connections.map((c) => (
            <div key={c.id} className={`card-luxe p-5 ${active?.id === c.id ? "border-primary" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-2xl">{c.profile.name} {c.demo && <span className="text-xs text-gold">demo</span>}</p>
                  <p className="text-xs text-muted-foreground">{c.label} · {c.profile.tastes.length} tastes</p>
                </div>
                {active?.id === c.id ? <span className="text-xs text-primary">Active</span> :
                  <Button size="sm" variant="outline" onClick={() => update((st) => ({ ...st, activeId: c.id }))}>Select</Button>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" asChild><Link to="/reveal">Taste Reveal</Link></Button>
                <Button size="sm" variant="ghost" onClick={() => update((st) => ({ ...st, connections: st.connections.filter((x) => x.id !== c.id) }))}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

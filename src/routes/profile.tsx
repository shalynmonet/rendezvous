import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Page, PageTitle, RueSays, TasteEditor } from "@/components/rue";
import { useStore } from "@/lib/store";
import type { TasteT } from "@/lib/rue.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your Taste Profile — Rendezvous" }, { name: "description", content: "Tell Rue what you love; Qloo maps it." }, { property: "og:title", content: "Your Taste Profile — Rendezvous" }, { property: "og:description", content: "Build the taste profile Rue uses everywhere." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { s, ready, update } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [tastes, setTastes] = useState<TasteT[]>([]);
  useEffect(() => { if (ready && s.me) { setName(s.me.name); setCity(s.me.city); setTastes(s.me.tastes); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!name.trim() || tastes.length < 3) { toast.error("A name and at least three favorites, s'il vous plaît."); return; }
    update((st) => ({ ...st, me: { name: name.trim(), city: city.trim() || "Chicago", tastes } }));
    toast.success("Saved. Rue knows.");
    nav({ to: "/connections" });
  };

  return (
    <Page>
      <PageTitle eyebrow="Step one" title="Your Taste Profile" sub="Sixty seconds. Pick from Qloo's suggestions so Rue can read the taste graph precisely." />
      <div className="card-luxe space-y-6 p-6">
        <RueSays>Tell me three things you'd defend at a dinner party.</RueSays>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Your city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <TasteEditor value={tastes} onChange={setTastes} />
        <Button onClick={save}>Save my tastes</Button>
      </div>
    </Page>
  );
}

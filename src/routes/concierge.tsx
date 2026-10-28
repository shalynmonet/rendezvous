import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote, Page, PageTitle, RueSays, RueThinking, TasteEditor, WhyChip } from "@/components/rue";
import { submitConcierge, type TasteT } from "@/lib/rue.functions";

export const Route = createFileRoute("/concierge")({
  head: () => ({ meta: [{ title: "Concierge — Rendezvous" }, { name: "description", content: "Premium: Rue builds a Taste Portrait of your loved one; Shalyn reviews and books." }, { property: "og:title", content: "Rendezvous Concierge" }, { property: "og:description", content: "Leave the details to Rue — and Shalyn." }] }),
  component: Concierge,
});

type Result = Awaited<ReturnType<typeof submitConcierge>>;

function Concierge() {
  const submit = useServerFn(submitConcierge);
  const [f, setF] = useState({ planner_name: "", planner_email: "", loved_one_name: "", occasion: "", format: "date" as "date" | "weekend" | "trip", city_or_destination: "", dates: "", budget: "", notes: "" });
  const [tastes, setTastes] = useState<TasteT[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const go = async () => {
    if (!f.planner_name || !f.planner_email || !f.loved_one_name || !f.city_or_destination || !tastes.length) { setErr("Your name, email, their name, a destination and at least one of their favorites, please."); return; }
    setBusy(true); setErr("");
    try { setRes(await submit({ data: { ...f, loved_one_tastes: tastes } })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (res) return (
    <Page>
      <PageTitle eyebrow="Taste Portrait" title={res.portrait.headline} sub={res.portrait.summary} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-luxe space-y-4 p-6">
          <h2 className="text-3xl font-semibold">Signals</h2>
          {res.portrait.signals.map((s, i) => <div key={i}><p className="font-display text-xl">{s.label}</p><WhyChip>{s.reason}</WhyChip></div>)}
          <p className="rounded-lg bg-muted p-3 text-sm"><b className="text-gold">Surprise: </b>{res.portrait.surprise}</p>
        </div>
        <div className="card-luxe space-y-4 p-6">
          <h2 className="text-3xl font-semibold">Draft plan</h2>
          {res.draft_plan.stops.map((s, i) => <div key={i}><p className="text-xs uppercase tracking-widest text-gold">{s.type}</p><p className="font-display text-xl">{s.name}</p><WhyChip>{s.reason}</WhyChip></div>)}
        </div>
      </div>
      <div className="mt-6"><RueSays>Shalyn will review, refine, and reach out to {f.planner_email}. Discretion guaranteed.</RueSays></div>
    </Page>
  );

  return (
    <Page>
      <PageTitle eyebrow="Premium · Concierge" title="Plan for someone you love" sub="Rue builds a Taste Portrait and a draft plan. Shalyn, our human concierge, perfects it and books." />
      {busy ? <RueThinking label="Rue is painting their Taste Portrait…" /> : (
        <div className="card-luxe space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Your name" value={f.planner_name} onChange={set("planner_name")} />
            <Input type="email" placeholder="Your email" value={f.planner_email} onChange={set("planner_email")} />
            <Input placeholder="Their name" value={f.loved_one_name} onChange={set("loved_one_name")} />
            <Input placeholder="Occasion (anniversary, birthday…)" value={f.occasion} onChange={set("occasion")} />
            <select value={f.format} onChange={set("format")} className="h-9 rounded-md border bg-transparent px-3 text-sm">
              <option value="date" className="bg-popover">A date</option><option value="weekend" className="bg-popover">A weekend</option><option value="trip" className="bg-popover">A trip</option>
            </select>
            <Input placeholder="City or destination" value={f.city_or_destination} onChange={set("city_or_destination")} />
            <Input placeholder="Dates" value={f.dates} onChange={set("dates")} />
            <Input placeholder="Budget" value={f.budget} onChange={set("budget")} />
          </div>
          <p className="pt-2 font-display text-xl">What do they love?</p>
          <TasteEditor value={tastes} onChange={setTastes} />
          <Textarea placeholder="Anything else Rue should know?" value={f.notes} onChange={set("notes")} />
          {err && <ErrorNote msg={err} />}
          <Button size="lg" onClick={go}>Send to Rue</Button>
        </div>
      )}
    </Page>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RefreshCw, Music, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ErrorNote,
  NeedPair,
  Page,
  PageTitle,
  RueSays,
  RueThinking,
  ToolTrail,
  WhyChip,
} from "@/components/rue";
import { planDate, type Plan } from "@/lib/rue.functions";
import { setState, storeSnapshot } from "@/lib/store";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Plan a Date — Rendezvous" },
      {
        name: "description",
        content:
          "Three taste-matched stops and a blended soundtrack, each with a reason from Qloo.",
      },
      { property: "og:title", content: "Plan a Date — Rendezvous" },
      { property: "og:description", content: "Ru plans the evening from both your tastes." },
    ],
  }),
  component: () => (
    <Page>
      <NeedPair>{(ctx) => <PlanView key={ctx.active.id} {...ctx} />}</NeedPair>
    </Page>
  ),
});

type Ctx = Parameters<Parameters<typeof NeedPair>[0]["children"]>[0];
const VIBES = ["Cozy & intimate", "Playful", "Artsy", "Fancy", "Low-key"];

function PlanView({ me, active }: Ctx) {
  const run = useServerFn(planDate);
  const [city, setCity] = useState(me.city || "Chicago");
  const [vibe, setVibe] = useState(VIBES[0]);
  const [budget, setBudget] = useState("$$");
  const [plan, setPlan] = useState<Plan | null>(() => (storeSnapshot().plans?.[active.id] as Plan | undefined) ?? null);
  const [tools, setTools] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const base = { a: me, b: active.profile, city, vibe, budget };

  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await run({ data: base });
      setPlan(r.plan);
      setTools(r.toolsUsed);
      setState((s) => ({ ...s, lastPlan: r.plan, plans: { ...s.plans, [active.id]: r.plan } }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const swap = async (i: number) => {
    if (!plan) return;
    setSwapping(i);
    setErr("");
    try {
      const r = await run({
        data: {
          ...base,
          swap: { type: plan.stops[i]?.type ?? "dinner", avoid: plan.stops.map((s) => s.name) },
        },
      });
      const next = r.plan.stops[0];
      if (next) {
        const p = { ...plan, stops: plan.stops.map((s, j) => (j === i ? next : s)) };
        setPlan(p);
        setState((s) => ({ ...s, lastPlan: p, plans: { ...s.plans, [active.id]: p } }));
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSwapping(null);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="Plan a date"
        title={`An evening for ${me.name} & ${active.profile.name}`}
      />
      <div className="card-luxe space-y-4 p-6">
        <RueSays>Give me a city and a mood. I'll handle the rest.</RueSays>
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          <select
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {VIBES.map((v) => (
              <option key={v} className="bg-popover">
                {v}
              </option>
            ))}
          </select>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {["$", "$$", "$$$", "$$$$"].map((v) => (
              <option key={v} className="bg-popover">
                {v}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={go} disabled={busy}>
          {plan ? "Plan again" : "Plan our date"}
        </Button>
      </div>
      <div className="mt-6 space-y-6">
        {busy && <RueThinking />}
        {err && <ErrorNote msg={err} />}
        {plan && !busy && (
          <>
            <div className="text-center">
              <h2 className="text-5xl font-semibold italic">{plan.title}</h2>
              <p className="mt-2 font-display text-xl text-muted-foreground">“{plan.rue_line}”</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {plan.stops.map((s, i) => (
                <div key={i} className="card-luxe flex flex-col p-5">
                  <p className="text-xs uppercase tracking-widest text-gold">
                    {i + 1}. {s.type}
                  </p>
                  <p className="mt-1 font-display text-2xl">{s.name}</p>
                  {s.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {s.address}
                    </p>
                  )}
                  <WhyChip>{s.reason}</WhyChip>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-auto self-start pt-4"
                    disabled={swapping !== null}
                    onClick={() => swap(i)}
                  >
                    <RefreshCw className={`h-4 w-4 ${swapping === i ? "animate-spin" : ""}`} /> Swap
                  </Button>
                </div>
              ))}
            </div>
            <div className="card-luxe p-6">
              <h3 className="flex items-center gap-2 text-3xl font-semibold">
                <Music className="h-6 w-6 text-primary" /> The soundtrack
              </h3>
              <ol className="mt-4 grid gap-3 md:grid-cols-2">
                {plan.soundtrack.map((s, i) => (
                  <li key={i} className="rounded-lg bg-muted p-3">
                    <a
                      href={s.spotify_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 font-semibold hover:text-primary"
                    >
                      {s.song} — {s.artist}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-muted-foreground">{s.reason}</p>
                  </li>
                ))}
              </ol>
            </div>
            <ToolTrail tools={tools} />
            <Button variant="outline" asChild>
              <Link to="/recap">Make a recap card</Link>
            </Button>
          </>
        )}
      </div>
    </>
  );
}

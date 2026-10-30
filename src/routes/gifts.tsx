import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Gift, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote, Page, PageTitle, RueSays, RueThinking, WhyChip } from "@/components/rue";
import { giftGuide } from "@/lib/gifts.functions";
import { GIFT_BUDGETS, GIFT_STYLES, type GiftQuestions, type SavedGiftGuide } from "@/lib/gift-schemas";
import { setState, useStore, type Connection } from "@/lib/store";

export const Route = createFileRoute("/gifts")({
  head: () => ({
    meta: [
      { title: "Gift Guide — Rendezvous" },
      { name: "description", content: "Ru picks 4–5 taste-matched gift ideas for a connection or anyone you love." },
      { property: "og:title", content: "Gift Guide — Rendezvous" },
      { property: "og:description", content: "Tell Ru who it's for and she'll find the perfect gift." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GiftsPage,
});

type Target = { kind: "connection"; c: Connection } | { kind: "custom" } | null;
const blankQ: GiftQuestions = { relationship: "", age_range: "", interests: "", favorites: "", style: "", avoid: "" };
const sel = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

function GiftsPage() {
  const { s, ready } = useStore();
  const run = useServerFn(giftGuide);
  const [target, setTarget] = useState<Target>(null);
  const [name, setName] = useState("");
  const [q, setQ] = useState<GiftQuestions>(blankQ);
  const [occasion, setOccasion] = useState("");
  const [budget, setBudget] = useState(GIFT_BUDGETS[2]!);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shown, setShown] = useState<SavedGiftGuide | null>(null);

  if (!ready) return null;
  const saved = Object.values((s.gifts ?? {}) as Record<string, SavedGiftGuide>).sort((a, b) => b.at.localeCompare(a.at));
  const people = s.connections.filter((c, i, all) => all.findIndex((o) => o.id === c.id) === i);

  const pick = (t: Target) => {
    setTarget(t);
    setShown(t?.kind === "connection" ? (((s.gifts ?? {}) as Record<string, SavedGiftGuide>)[t.c.id] ?? null) : null);
    setErr("");
    if (t?.kind === "custom") { setName(""); setQ(blankQ); }
  };

  const go = async () => {
    if (!target) return;
    const custom = target.kind === "custom";
    const who = custom ? name.trim() : target.c.profile.name;
    if (!who || (custom && (!q.relationship.trim() || !q.interests.trim()))) {
      setErr("Ru needs their name, how you know them and a few interests.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await run({
        data: {
          name: who,
          occasion,
          budget,
          tastes: custom ? [] : target.c.profile.tastes.map(({ category, label, entity_id }) => ({ category, label, entity_id })),
          questions: custom ? q : undefined,
        },
      });
      const key = custom ? `custom:${who.toLowerCase()}:${q.relationship.toLowerCase()}` : target.c.id;
      const entry: SavedGiftGuide = { key, name: who, kind: target.kind, occasion, budget, ...(custom ? { questions: q } : {}), guide: r.guide, at: new Date().toISOString() };
      setShown(entry);
      setState((st) => ({ ...st, gifts: { ...st.gifts, [key]: entry } }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof GiftQuestions) => ({ value: q[k], onChange: (e: { target: { value: string } }) => setQ({ ...q, [k]: e.target.value }) });

  return (
    <Page>
      <PageTitle eyebrow="Gift guide" title="Who are we spoiling?" sub="Pick one of your people, or tell Ru about someone who isn't on Rendezvous." />

      <div className="card-luxe space-y-4 p-6">
        <RueSays>Choose the lucky one. I'll find four or five gifts they'll actually love.</RueSays>
        <div className="flex flex-wrap gap-2">
          {people.map((c) => (
            <Button key={c.id} variant={target?.kind === "connection" && target.c.id === c.id ? "default" : "outline"} onClick={() => pick({ kind: "connection", c })}>
              <UsersRound className="h-4 w-4" /> {c.profile.name}{c.demo ? " (demo)" : ""}
            </Button>
          ))}
          <Button variant={target?.kind === "custom" ? "default" : "outline"} onClick={() => pick({ kind: "custom" })}>
            <UserRound className="h-4 w-4" /> Someone else (like Mom)
          </Button>
        </div>
        {!people.length && (
          <p className="text-sm text-muted-foreground">
            No connections yet — <Link to="/connections" className="text-gold underline">invite someone</Link>, or choose "Someone else".
          </p>
        )}
      </div>

      {target && (
        <div className="card-luxe mt-6 space-y-4 p-6">
          {target.kind === "custom" ? (
            <>
              <RueSays>They're not on Rendezvous, so tell me about them.</RueSays>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">Their name<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mom" /></label>
                <label className="space-y-1 text-sm">How do you know them?<Input {...field("relationship")} placeholder="e.g. my mother" /></label>
                <label className="space-y-1 text-sm">Age range<Input {...field("age_range")} placeholder="e.g. 60s" /></label>
                <label className="space-y-1 text-sm">What kind of gift do they love?
                  <select {...field("style")} className={sel}>
                    <option value="" className="bg-popover">Any</option>
                    {GIFT_STYLES.map((v) => <option key={v} className="bg-popover">{v}</option>)}
                  </select>
                </label>
              </div>
              <label className="block space-y-1 text-sm">What do they love doing?<Textarea {...field("interests")} placeholder="Gardening, mystery novels, Sunday brunch, yoga…" /></label>
              <label className="block space-y-1 text-sm">Favorite music, films, shows, foods or brands<Textarea {...field("favorites")} placeholder="Aretha Franklin, The Great British Bake Off, Le Creuset…" /></label>
              <label className="block space-y-1 text-sm">Anything to avoid, or they already have?<Input {...field("avoid")} placeholder="Has every candle ever made" /></label>
            </>
          ) : (
            <RueSays>I already know {target.c.profile.name}'s tastes. Just set the occasion and budget.</RueSays>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">Occasion<Input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Birthday, anniversary, just because…" /></label>
            <label className="space-y-1 text-sm">Budget
              <select value={budget} onChange={(e) => setBudget(e.target.value)} className={sel}>
                {GIFT_BUDGETS.map((v) => <option key={v} className="bg-popover">{v}</option>)}
              </select>
            </label>
          </div>
          <Button onClick={go} disabled={busy}><Gift className="h-4 w-4" /> {shown ? "Get a fresh guide" : "Find the gifts"}</Button>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {busy && <RueThinking label="Ru is shopping…" />}
        {err && <ErrorNote msg={err} />}
        {shown && !busy && <GuideView g={shown} />}
        {saved.length > 0 && (
          <div className="card-luxe p-6">
            <h3 className="text-2xl font-semibold">Saved gift guides</h3>
            <ul className="mt-3 space-y-2">
              {saved.map((g) => (
                <li key={g.key}>
                  <button className="text-left hover:text-primary" onClick={() => { setShown(g); setTarget(null); }}>
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-sm text-muted-foreground"> · {g.occasion || "Just because"} · {new Date(g.at).toLocaleDateString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Page>
  );
}

function GuideView({ g }: { g: SavedGiftGuide }) {
  return (
    <>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-gold">For {g.name} · {g.budget}</p>
        <h2 className="text-4xl font-semibold italic">{g.guide.headline}</h2>
        <p className="mt-2 font-display text-xl text-muted-foreground">“{g.guide.rue_line}”</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {g.guide.gifts.map((x, i) => (
          <div key={i} className="card-luxe flex flex-col p-5">
            <p className="text-xs uppercase tracking-widest text-gold">{i + 1}. {x.category} · {x.price_range}</p>
            <p className="mt-1 font-display text-2xl">{x.name}</p>
            <WhyChip>{x.why}</WhyChip>
            <p className="mt-3 text-sm text-muted-foreground">Find it: {x.where_to_find}</p>
          </div>
        ))}
      </div>
    </>
  );
}

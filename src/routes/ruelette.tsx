import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Heart, Check, Upload, Music, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import rueletta from "@/assets/rueletta.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ErrorNote, NeedPair, Page, PageTitle, RueSays, RueThinking, WhyChip } from "@/components/rue";
import { rueView, spinRuelette, type Activity, type AiMode } from "@/lib/ruelette.functions";
import { setState, type Profile, type Memory } from "@/lib/store";

export const Route = createFileRoute("/ruelette")({
  head: () => ({
    meta: [
      { title: "Rue-lette — spin for a date-night activity | Rendezvous" },
      { name: "description", content: "Spin Rue's wheel for a taste-matched game, song, recipe, photo booth or portrait challenge for two." },
      { property: "og:title", content: "Rue-lette — Rue spins your next date activity" },
      { property: "og:description", content: "Six playful activity modes built from both your tastes, hosted by Rue the fox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Page>
      <PageTitle eyebrow="Rue-lette" title="Spin the wheel, darling" sub="Six ways to play tonight. Rue picks; your tastes decide the details." />
      <NeedPair>{(ctx) => <Ruelette me={ctx.me} partner={ctx.active.profile} connectionId={ctx.active.id} memories={ctx.s.memories ?? []} />}</NeedPair>
    </Page>
  ),
});

type Mode = "game" | AiMode;
const SLICES: { mode: Mode; label: string; emoji: string }[] = [
  { mode: "game", label: "Instant game", emoji: "🎲" },
  { mode: "game_prompt", label: "AI game prompt", emoji: "🕹️" },
  { mode: "song", label: "Song & vibe", emoji: "🎷" },
  { mode: "recipe", label: "Date menu", emoji: "🍷" },
  { mode: "photo_booth", label: "Photo booth", emoji: "📸" },
  { mode: "portrait", label: "Portraits", emoji: "🎨" },
];

function Ruelette({ me, partner, connectionId, memories }: { me: Profile; partner: Profile; connectionId: string; memories: Memory[] }) {
  const spin = useServerFn(spinRuelette);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [debrief, setDebrief] = useState(false);

  const load = async (m: Mode) => {
    setMode(m); setActivity(null); setErr("");
    if (m === "game") return;
    setBusy(true);
    try { setActivity((await spin({ data: { mode: m, a: me, b: partner } })).activity); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const doSpin = () => {
    if (spinning) return;
    const i = Math.floor(Math.random() * SLICES.length);
    // pointer at top; slice i centered at i*60+30 deg
    const target = rot - (rot % 360) + 360 * 5 + (360 - (i * 60 + 30));
    setSpinning(true); setRot(target); setMode(null); setActivity(null);
    setTimeout(() => { setSpinning(false); void load(SLICES[i]!.mode); }, 4200);
  };

  const label = SLICES.find((s) => s.mode === mode)?.label ?? "";
  const mine = memories.filter((m) => m.connectionId === connectionId);

  return (
    <div className="space-y-10">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-gold/35">
          <img src={rueletta.url} alt="Rue the fox in heart sunglasses and a houndstooth scarf at a café table" className="aspect-[4/3] w-full object-cover object-[40%_30%]" />
          <div className="hero-fade absolute inset-0" />
          <div className="absolute bottom-4 left-4 right-4">
            <RueSays>{spinning ? "Round and round… faites vos jeux." : mode ? `${label}. Rue has spoken.` : `${me.name}, ${partner.name} — shall we play?`}</RueSays>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-72 w-72 sm:h-80 sm:w-80">
            <Heart className="absolute -top-3 left-1/2 z-10 h-8 w-8 -translate-x-1/2 fill-primary text-gold drop-shadow" aria-hidden />
            <motion.div
              className="ruelette-wheel absolute inset-0 rounded-full border-4 border-gold shadow-candle"
              animate={{ rotate: rot }}
              transition={{ duration: 4, ease: [0.15, 0.85, 0.2, 1] }}
            >
              {SLICES.map((s, i) => (
                <div key={s.mode} className="absolute inset-0" style={{ transform: `rotate(${i * 60 + 30}deg)` }}>
                  <div className="mx-auto mt-4 flex w-20 flex-col items-center text-center text-xs font-semibold text-foreground">
                    <span className="text-2xl">{s.emoji}</span>{s.label}
                  </div>
                </div>
              ))}
              <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-background houndstooth-dot" />
            </motion.div>
          </div>
          <Button size="lg" className="shadow-candle" onClick={doSpin} disabled={spinning || busy}>
            {spinning ? "Spinning…" : mode ? "Spin again" : "Spin the Rue-lette"}
          </Button>
          <div className="flex flex-wrap justify-center gap-2">
            {SLICES.map((s) => (
              <button key={s.mode} onClick={() => !spinning && !busy && load(s.mode)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-gold hover:text-foreground">
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode && (
          <motion.section key={mode + (activity ? "1" : "0")} initial={{ opacity: 0, rotateX: -12, y: 20 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }} className="space-y-4">
            {err && <ErrorNote msg={err} />}
            {busy && <RueThinking />}
            {mode === "game" && <TasteQuiz me={me} partner={partner} />}
            {activity && <ActivityCard a={activity} me={me} partner={partner} />}
            {(mode === "game" || activity) && (
              <div className="flex justify-end"><Button onClick={() => setDebrief(true)}><Check className="mr-2 h-4 w-4" />We finished — Rue-view</Button></div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {mine.length > 0 && (
        <section>
          <h2 className="text-3xl font-semibold italic">Your memory book</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {mine.map((m) => (
              <div key={m.id} className="card-luxe p-5">
                <p className="text-xs uppercase tracking-widest text-gold">{new Date(m.at).toLocaleDateString()} · {m.activity}</p>
                <h3 className="mt-1 text-2xl font-semibold">{m.milestone}</h3>
                <p className="mt-1 text-gold">{"♥".repeat(m.rating)}<span className="text-muted-foreground">{"♥".repeat(5 - m.rating)}</span></p>
                {m.notes && <p className="mt-2 text-sm text-muted-foreground">“{m.notes}”</p>}
                <p className="mt-2 font-display text-lg italic">Rue: {m.commentary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Debrief open={debrief} onOpenChange={setDebrief} a={me.name} b={partner.name} activity={activity?.title ?? label} connectionId={connectionId} />
    </div>
  );
}

function TasteQuiz({ me, partner }: { me: Profile; partner: Profile }) {
  const deck = useMemo(() => {
    const all = [...me.tastes.map((t) => ({ t, who: "a" as const })), ...partner.tastes.map((t) => ({ t, who: "b" as const }))];
    return all.sort(() => Math.random() - 0.5).slice(0, 8);
  }, [me, partner]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [last, setLast] = useState<boolean | null>(null);
  const done = i >= deck.length;
  const pick = (who: "a" | "b") => {
    const ok = deck[i]!.who === who;
    setLast(ok); if (ok) setScore((s) => s + 1);
    setTimeout(() => { setI((x) => x + 1); setLast(null); }, 700);
  };
  return (
    <div className="card-luxe p-6">
      <p className="text-xs uppercase tracking-widest text-gold">Instant game · Whose taste is it?</p>
      <p className="mt-1 text-sm text-muted-foreground">Play together on one screen. Agree on an answer before you tap — it's co-op.</p>
      {done ? (
        <div className="mt-6 text-center">
          <p className="font-display text-5xl italic">{score} / {deck.length}</p>
          <p className="mt-2 text-muted-foreground">{score >= deck.length - 1 ? "Telepathic. I'm almost jealous." : score >= deck.length / 2 ? "Respectable. You've been listening." : "Mon dieu. Tonight's homework: each other."}</p>
          <Button variant="outline" className="mt-4" onClick={() => { setI(0); setScore(0); }}>Play again</Button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.3 }} className="mt-6 text-center">
            <p className="text-xs uppercase text-gold">{deck[i]!.t.category} · {i + 1}/{deck.length}</p>
            <p className="mt-2 font-display text-4xl italic">{deck[i]!.t.label}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button disabled={last !== null} onClick={() => pick("a")}>{me.name}</Button>
              <Button disabled={last !== null} variant="outline" onClick={() => pick("b")}>{partner.name}</Button>
            </div>
            <p className="mt-3 h-5 text-sm">{last === true ? "Correct ♥" : last === false ? "Non, non…" : ""}</p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  return <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(text); toast.success("Copied"); }}><Copy className="mr-2 h-4 w-4" />Copy prompt</Button>;
}
const Pre = ({ children }: { children: string }) => <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 text-sm">{children}</p>;

function ActivityCard({ a, me, partner }: { a: Activity; me: Profile; partner: Profile }) {
  const [checked, setChecked] = useState<number[]>([]);
  const [imgs, setImgs] = useState<[string | null, string | null]>([null, null]);
  return (
    <div className="card-luxe space-y-4 p-6">
      <h2 className="text-4xl font-semibold">{a.title}</h2>
      <RueSays>{a.rue_line}</RueSays>
      {a.mode === "game_prompt" && (<>
        <Pre>{a.prompt}</Pre><CopyBtn text={a.prompt} />
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{a.how_to_play.map((h, i) => <li key={i}>{h}</li>)}</ul>
        <a href="https://chatforce.ai" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-gold underline">Open an AI game builder <ExternalLink className="h-3 w-3" /></a>
      </>)}
      {a.mode === "song" && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-secondary"><Music className="h-10 w-10 text-gold" /></div>
          <div className="space-y-2">
            <p className="font-display text-3xl italic">“{a.song}” — {a.artist}</p>
            <p className="text-sm text-muted-foreground">{a.artist_background}</p>
            <p className="text-sm"><span className="text-gold">Mood: </span>{a.mood}</p>
            <Button size="sm" asChild><a href={a.spotify_url} target="_blank" rel="noreferrer">Play on Spotify</a></Button>
          </div>
        </div>
      )}
      {a.mode === "recipe" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-xl font-semibold text-gold">Menu</h3>
            {a.menu.map((m, i) => <p key={i}><span className="text-xs uppercase text-muted-foreground">{m.course}</span> · {m.dish}</p>)}
            <h3 className="mt-4 text-xl font-semibold text-gold">Ingredients</h3>
            <ul className="list-disc pl-5 text-sm">{a.ingredients.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gold">Steps</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm">{a.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
            <h3 className="mt-4 text-xl font-semibold text-gold">Cook together</h3>
            {a.cook_together.map((x, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2 py-1 text-sm">
                <input type="checkbox" className="mt-1 accent-primary" checked={checked.includes(i)} onChange={() => setChecked((c) => c.includes(i) ? c.filter((y) => y !== i) : [...c, i])} />
                <span className={checked.includes(i) ? "text-muted-foreground line-through" : ""}>{x}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {a.mode === "photo_booth" && (<>
        <Pre>{a.prompt}</Pre><CopyBtn text={a.prompt} />
        <p className="text-sm"><span className="text-gold">Twist: </span>{a.twist}</p>
        <div className="grid grid-cols-2 gap-3">
          {[me.name, partner.name].map((n, i) => (
            <label key={n} className="flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-gold/50 bg-muted text-sm text-muted-foreground">
              {imgs[i] ? <img src={imgs[i]!} alt={`${n}'s result`} className="h-full w-full object-cover" /> : <><Upload className="mb-2 h-6 w-6" />{n}'s result</>}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImgs((p) => { const c = [...p] as typeof p; c[i] = URL.createObjectURL(f); return c; }); }} />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Photos stay on this device.</p>
      </>)}
      {a.mode === "portrait" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-gold">{me.name}, you draw {partner.name}:</p><Pre>{a.prompt_for_a}</Pre></div>
          <div><p className="text-sm text-gold">{partner.name}, you draw {me.name}:</p><Pre>{a.prompt_for_b}</Pre></div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground md:col-span-2">{a.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
      <WhyChip>{a.reason}</WhyChip>
    </div>
  );
}

function Debrief({ open, onOpenChange, a, b, activity, connectionId }: { open: boolean; onOpenChange: (v: boolean) => void; a: string; b: string; activity: string; connectionId: string }) {
  const run = useServerFn(rueView);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ commentary: string; milestone: string } | null>(null);
  const [err, setErr] = useState("");
  const close = (v: boolean) => { onOpenChange(v); if (!v) { setRes(null); setNotes(""); setErr(""); } };
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await run({ data: { a, b, activity, rating, notes } });
      setRes(r);
      setState((s) => ({ ...s, memories: [{ id: crypto.randomUUID(), connectionId, activity, rating, notes, ...r, at: new Date().toISOString() }, ...(s.memories ?? [])] }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-3xl italic">The Rue-view</DialogTitle>
          <DialogDescription>So, {a} and {b}… how was “{activity}”? Spare no detail.</DialogDescription>
        </DialogHeader>
        {res ? (
          <div className="space-y-3">
            <RueSays>{res.commentary}</RueSays>
            <p className="text-center text-sm text-gold">Saved to your memory book: <strong>{res.milestone}</strong></p>
            <Button className="w-full" onClick={() => close(false)}>Merci, Rue</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} aria-label={`${n} hearts`} onClick={() => setRating(n)}><Heart className={`h-8 w-8 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>
              ))}
            </div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Best moment, worst moment, who won…" maxLength={1000} />
            {err && <ErrorNote msg={err} />}
            <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Rue is composing her verdict…" : "Tell Rue"}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

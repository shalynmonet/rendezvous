import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Heart, Check, Upload, Music, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import rendezvousMain from "@/assets/rendezvous-main-2.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ErrorNote, NeedPair, Page, PageTitle, RueSays, RueThinking, WhyChip } from "@/components/rue";
import { rueView, spinRuelette, roomRuelette, roomSpin, roomUpload, roomDebrief, type Activity, type AiMode, type RoomRuelette } from "@/lib/ruelette.functions";
import type { GuestRoom } from "@/lib/chat-schemas";
import { setState, type Profile, type Memory } from "@/lib/store";

export const Route = createFileRoute("/ru-lette")({
  head: () => ({
    meta: [
      { title: "Ru-lette — spin for a date-night activity | Rendezvous" },
      { name: "description", content: "Spin Ru's wheel for a taste-matched game, song, recipe, photo booth or portrait challenge for two." },
      { property: "og:title", content: "Ru-lette — Ru spins your next date activity" },
      { property: "og:description", content: "Six playful activity modes built from both your tastes, hosted by Ru the fox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Page>
      <PageTitle eyebrow="Ru-lette" title="Spin the wheel, darling" sub="Six ways to play tonight. Ru picks; your tastes decide the details." />
      <NeedPair autoDemo>{(ctx) => <Ruelette key={ctx.active.id} me={ctx.me} partner={ctx.active.profile} connectionId={ctx.active.id} memories={ctx.s.memories ?? []} room={ctx.active.room} demo={ctx.active.demo ?? false} />}</NeedPair>
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

type Shared = { room: GuestRoom; state: RoomRuelette | null; setState: (r: RoomRuelette) => void };

function useSharedRuelette(room: GuestRoom | undefined) {
  const read = useServerFn(roomRuelette);
  const [state, set] = useState<RoomRuelette | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!room) return;
    let stop = false; let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const r = await read({ data: { room: room.id, token: room.token } }); if (!stop) { set(r); setErr(""); } }
      catch (e) { if (!stop) setErr((e as Error).message); }
      if (!stop) t = setTimeout(poll, document.hidden ? 8000 : 2000);
    };
    void poll();
    return () => { stop = true; clearTimeout(t); };
  }, [room, read]);
  return { state, set, err };
}

function Ruelette({ me, partner, connectionId, memories, room, demo }: { me: Profile; partner: Profile; connectionId: string; memories: Memory[]; room?: GuestRoom | undefined; demo?: boolean }) {
  const spin = useServerFn(spinRuelette);
  const spinRoom = useServerFn(roomSpin);
  const shared = useSharedRuelette(room);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [localMode, setLocalMode] = useState<Mode | null>(null);
  const [localActivity, setLocalActivity] = useState<Activity | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [err, setErr] = useState("");
  const [debrief, setDebrief] = useState(false);
  const seen = useRef<string | null | undefined>(undefined);
  const st = shared.state;

  // When the shared spin changes, animate the wheel for both people.
  useEffect(() => {
    if (!room || !st) return;
    if (seen.current === undefined) { seen.current = st.spin_id; setRot(st.rot); return; }
    if (st.spin_id && st.spin_id !== seen.current) {
      seen.current = st.spin_id; setRot(st.rot); setSpinning(true);
      setTimeout(() => setSpinning(false), 4200);
    }
  }, [room, st]);

  // Log a shared Ru-view into this browser's memory book.
  useEffect(() => {
    if (!st?.debrief || !st.spin_id) return;
    const id = st.spin_id; const d = st.debrief;
    if (memories.some((m) => m.id === id)) return;
    setState((s) => ({ ...s, memories: [{ id, connectionId, activity: st.activity?.title ?? SLICES.find((x) => x.mode === st.mode)?.label ?? "Ru-lette", milestone: d.milestone, rating: d.rating, notes: d.notes, commentary: d.commentary, at: d.at }, ...(s.memories ?? [])] }));
  }, [st, memories, connectionId]);

  const mode: Mode | null = room ? (spinning ? null : st?.mode ?? null) : localMode;
  const activity = room ? (spinning ? null : st?.activity ?? null) : localActivity;
  const busy = room ? st?.status === "generating" : localBusy;
  const shownErr = room ? (st?.status === "error" ? st.error ?? "Ru fumbled the cards. Spin again." : shared.err || err) : err;
  const waiting = !!room && st !== null && !st.joined;

  const loadLocal = async (m: Mode) => {
    setLocalMode(m); setLocalActivity(null); setErr("");
    if (m === "game") return;
    setLocalBusy(true);
    try { setLocalActivity((await spin({ data: { mode: m, a: me, b: partner } })).activity); }
    catch (e) { setErr((e as Error).message); }
    finally { setLocalBusy(false); }
  };

  const go = (i: number, animate: boolean) => {
    if (requesting) return;
    const target = animate ? rot - (rot % 360) + 360 * 5 + (360 - (i * 60 + 30)) : rot;
    const m = SLICES[i]?.mode;
    if (!m) return;
    if (room) {
      setErr("");
      setRequesting(true);
      // The player who spins sends both profiles in room order (a = creator).
      const [a, b] = st?.side === "b" ? [partner, me] : [me, partner];
      spinRoom({ data: { room: room.id, token: room.token, mode: m, rot: target, a, b, expected_spin: st?.spin_id ?? null } })
        .then((r) => shared.set(r)).catch((e) => setErr((e as Error).message)).finally(() => setRequesting(false));
      return;
    }
    if (!animate) { void loadLocal(m); return; }
    setSpinning(true); setRot(target); setLocalMode(null); setLocalActivity(null);
    setTimeout(() => { setSpinning(false); void loadLocal(m); }, 4200);
  };
  const doSpin = () => { if (!spinning && !busy) go(Math.floor(Math.random() * SLICES.length), true); };
  const respondToSpin = async (action: "approve_spin" | "cancel_spin") => {
    const proposal = st?.next_spin;
    if (!room || !st || !proposal || requesting) return;
    setRequesting(true); setErr("");
    const [a, b] = st.side === "b" ? [partner, me] : [me, partner];
    try {
      shared.set(await spinRoom({ data: { room: room.id, token: room.token, mode: proposal.mode, rot: proposal.rot, a, b, expected_spin: st.spin_id, action, proposal_id: proposal.id } }));
    } catch (e) { setErr((e as Error).message); }
    finally { setRequesting(false); }
  };

  const label = SLICES.find((s) => s.mode === mode)?.label ?? "";
  const mine = memories.filter((m) => m.connectionId === connectionId);
  const sharedCtx: Shared | undefined = room ? { room, state: st, setState: shared.set } : undefined;
  const spunBy = room && st?.by ? (st.by === st.side ? "You" : partner.name) : null;

  return (
    <div className="space-y-10">
      <p className="rounded-full border border-gold/40 bg-muted px-4 py-2 text-center text-sm text-muted-foreground">
        {room ? (waiting ? `Waiting for ${partner.name} to accept your invitation — then you'll share this table live.` : <>🔴 Live table with {partner.name} — you both see every spin, card and photo.</>) : demo ? <>Solo table · {partner.name} is your demo partner. <Link to="/connections" className="text-gold underline">Invite a real person</Link></> : <>Playing on this device with {partner.name}. <Link to="/connections" className="text-gold underline">Share a live table</Link></>}
      </p>
      <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-gold/35">
          <img src={rendezvousMain.url} alt="Ru the fox in heart sunglasses and a houndstooth scarf at her jazz café table" className="aspect-[1920/1072] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/85 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <RueSays>{spinning ? "Round and round… faites vos jeux." : mode ? `${label}${spunBy ? ` (${spunBy} spun)` : ""}. Ru has spoken.` : `${me.name}, ${partner.name} — shall we play?`}</RueSays>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-72 w-72 sm:h-80 sm:w-80">
            <Heart className="absolute -top-3 left-1/2 z-10 h-8 w-8 -translate-x-1/2 fill-primary text-gold drop-shadow" aria-hidden />
            <motion.div
              className="ruelette-wheel absolute inset-0 rounded-full border-4 border-gold shadow-candle"
              animate={{ rotate: rot }}
              transition={{ duration: spinning ? 4 : 0, ease: [0.15, 0.85, 0.2, 1] }}
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
          <Button size="lg" className="shadow-candle" onClick={doSpin} disabled={spinning || busy || waiting || requesting || !!st?.next_spin || (!!room && !st)}>
            {spinning ? "Spinning…" : room && mode ? "Request next spin" : mode ? "Spin again" : "Spin the Ru-lette"}
          </Button>
          <div className="flex flex-wrap justify-center gap-2">
            {SLICES.map((s, i) => (
              <Button variant="outline" size="sm" key={s.mode} disabled={spinning || busy || waiting || requesting || !!st?.next_spin || (!!room && !st)} onClick={() => go(i, false)} className="text-xs">
                {s.emoji} {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {st?.next_spin && (
        <section className="flex flex-wrap items-center justify-between gap-4 border-y py-4" aria-live="polite">
          <p>{st.next_spin.by === st.side ? `Waiting for ${partner.name} to approve respin` : `${partner.name} wants to respin — waiting for your approval`}</p>
          <div className="flex flex-wrap gap-2">
            {st.next_spin.by !== st.side && <Button disabled={requesting} onClick={() => void respondToSpin("approve_spin")}><Check className="mr-2 h-4 w-4" />Ready — spin together</Button>}
            <Button variant="outline" disabled={requesting} onClick={() => void respondToSpin("cancel_spin")}>{st.next_spin.by === st.side ? "Cancel request" : "Not yet — keep this activity"}</Button>
          </div>
        </section>
      )}

      <AnimatePresence mode="wait">
        {(mode || shownErr) && (
          <motion.section key={(st?.spin_id ?? mode ?? "") + (activity ? "1" : "0")} initial={{ opacity: 0, rotateX: -12, y: 20 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }} className="space-y-4">
            {shownErr && <ErrorNote msg={shownErr} />}
            {busy && <RueThinking />}
            {mode === "game" && <TasteQuiz key={st?.spin_id ?? "local"} me={me} partner={partner} seed={st?.spin_id ?? null} />}
            {activity && <ActivityCard a={activity} me={me} partner={partner} shared={sharedCtx} />}
            {st?.debrief && mode && (
              <div className="card-luxe space-y-2 p-5">
                <p className="text-xs uppercase tracking-widest text-gold">Ru-view · {st.debrief.by === st.side ? "you" : partner.name} reported {"♥".repeat(st.debrief.rating)}</p>
                {st.debrief.notes && <p className="text-sm text-muted-foreground">“{st.debrief.notes}”</p>}
                <RueSays>{st.debrief.commentary}</RueSays>
                <p className="text-sm text-gold">Saved to your memory book: <strong>{st.debrief.milestone}</strong></p>
              </div>
            )}
            {(mode === "game" || activity) && !st?.debrief && (
              <div className="flex justify-end"><Button onClick={() => setDebrief(true)}><Check className="mr-2 h-4 w-4" />We finished — Ru-view</Button></div>
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
                <p className="mt-2 font-display text-lg italic">Ru: {m.commentary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Debrief open={debrief} onOpenChange={setDebrief} a={me.name} b={partner.name} activity={activity?.title ?? label} connectionId={connectionId} shared={sharedCtx} />
    </div>
  );
}

function TasteQuiz({ me, partner, seed }: { me: Profile; partner: Profile; seed: string | null }) {
  const deck = useMemo(() => {
    const all = [...me.tastes.map((t) => ({ t, who: "a" as const })), ...partner.tastes.map((t) => ({ t, who: "b" as const }))];
    // Shared tables use the spin id as a seed so both people get the same cards.
    let x = seed ? parseInt(seed.replace(/-/g, "").slice(0, 8), 16) : Math.floor(Math.random() * 2 ** 31);
    const rnd = () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const sorted = [...all].sort((p, q) => (p.t.label < q.t.label ? -1 : 1));
    for (let i = sorted.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!]; }
    return sorted.slice(0, 8);
  }, [me, partner, seed]);
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

const clean = (x: string) => x.replace(/^\s*(\d+[.)]|[☐☑✓•-])\s*/u, "");

function CopyBtn({ text }: { text: string }) {
  return <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(text); toast.success("Copied"); }}><Copy className="mr-2 h-4 w-4" />Copy prompt</Button>;
}
const Pre = ({ children }: { children: string }) => <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 text-sm">{children}</p>;

function ActivityCard({ a, me, partner, shared }: { a: Activity; me: Profile; partner: Profile; shared?: Shared | undefined }) {
  const upload = useServerFn(roomUpload);
  const [upBusy, setUpBusy] = useState(false);
  const [checked, setChecked] = useState<number[]>([]);
  const [imgs, setImgs] = useState<[string | null, string | null]>([null, null]);
  return (
    <div className="card-luxe space-y-4 p-6">
      <h2 className="text-4xl font-semibold">{a.title}</h2>
      <RueSays>{a.rue_line}</RueSays>
      {a.mode === "game_prompt" && (<>
        <Pre>{a.prompt}</Pre><CopyBtn text={a.prompt} />
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{a.how_to_play.map((h, i) => <li key={i}>{h}</li>)}</ul>
        <a href="https://chatforce.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-gold underline">Open an AI game builder <ExternalLink className="h-3 w-3" /></a>
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
            <ol className="list-decimal space-y-1 pl-5 text-sm">{a.steps.map((x, i) => <li key={i}>{clean(x)}</li>)}</ol>
            <h3 className="mt-4 text-xl font-semibold text-gold">Cook together</h3>
            {a.cook_together.map((x, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2 py-1 text-sm">
                <input type="checkbox" className="mt-1 accent-primary" checked={checked.includes(i)} onChange={() => setChecked((c) => c.includes(i) ? c.filter((y) => y !== i) : [...c, i])} />
                <span className={checked.includes(i) ? "text-muted-foreground line-through" : ""}>{clean(x)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {a.mode === "photo_booth" && (<>
        <Pre>{a.prompt}</Pre><CopyBtn text={a.prompt} />
        <p className="text-sm"><span className="text-gold">Twist: </span>{a.twist}</p>
        <div className="grid grid-cols-2 gap-3">
          {[me.name, partner.name].map((n, i) => {
            const st = shared?.state;
            const slot = st ? (i === 0 ? st.side : st.side === "a" ? "b" : "a") : null;
            const src = st && slot ? st.photos[slot] : imgs[i];
            const canUpload = !shared || i === 0;
            return (
              <label key={n} className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-gold/50 bg-muted text-sm text-muted-foreground ${canUpload ? "cursor-pointer" : ""}`}>
                {src ? <img src={src} alt={`${n}'s result`} className="h-full w-full object-cover" /> : <><Upload className="mb-2 h-6 w-6" />{canUpload ? `${n}'s result` : `Waiting for ${n}…`}</>}
                {i === 0 && upBusy && <span className="absolute inset-x-0 bottom-0 bg-background/80 py-1 text-center text-xs">Uploading…</span>}
                {canUpload && <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  if (!shared) { setImgs((p) => { const c = [...p] as typeof p; c[i] = URL.createObjectURL(f); return c; }); return; }
                  if (f.size > 6 * 1024 * 1024) { toast.error("Photos must be under 6 MB."); return; }
                  const st2 = shared.state; if (!st2?.spin_id) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    setUpBusy(true);
                    try { shared.setState(await upload({ data: { room: shared.room.id, token: shared.room.token, spin_id: st2.spin_id!, image: String(reader.result) } })); }
                    catch (err) { toast.error((err as Error).message); } finally { setUpBusy(false); }
                  };
                  reader.readAsDataURL(f);
                }} />}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{shared ? "Photos are private to the two of you and appear on both screens." : "Photos stay on this device."}</p>
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

function Debrief({ open, onOpenChange, a, b, activity, connectionId, shared }: { open: boolean; onOpenChange: (v: boolean) => void; a: string; b: string; activity: string; connectionId: string; shared?: Shared | undefined }) {
  const run = useServerFn(rueView);
  const runRoom = useServerFn(roomDebrief);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ commentary: string; milestone: string } | null>(null);
  const [err, setErr] = useState("");
  const close = (v: boolean) => { onOpenChange(v); if (!v) { setRes(null); setNotes(""); setErr(""); } };
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      if (shared?.state?.spin_id) {
        const st = await runRoom({ data: { room: shared.room.id, token: shared.room.token, spin_id: shared.state.spin_id, a, b, activity, rating, notes } });
        shared.setState(st);
        if (st.debrief) setRes(st.debrief);
        return; // memory is logged from the shared state for both people
      }
      const r = await run({ data: { a, b, activity, rating, notes } });
      setRes(r);
      setState((s) => ({ ...s, memories: [{ id: crypto.randomUUID(), connectionId, activity, rating, notes, ...r, at: new Date().toISOString() }, ...(s.memories ?? [])] }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-3xl italic">The Ru-view</DialogTitle>
          <DialogDescription>So, {a} and {b}… how was “{activity}”? Spare no detail.</DialogDescription>
        </DialogHeader>
        {res ? (
          <div className="space-y-3">
            <RueSays>{res.commentary}</RueSays>
            <p className="text-center text-sm text-gold">Saved to your memory book: <strong>{res.milestone}</strong></p>
            <Button className="w-full" onClick={() => close(false)}>Merci, Ru</Button>
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
            <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Ru is composing her verdict…" : "Tell Ru"}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

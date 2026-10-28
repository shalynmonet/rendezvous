import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote, NeedPair, Page, PageTitle, RueAvatar } from "@/components/rue";
import { chatTurn, type ChatTurn } from "@/lib/rue.functions";
import { setState } from "@/lib/store";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat with Rue — Rendezvous" }, { name: "description", content: "Rue hosts taste-based games for two." }, { property: "og:title", content: "Chat with Rue — Rendezvous" }, { property: "og:description", content: "This or That, Defend Your Pick, Deep Cuts and more." }] }),
  component: () => <Page><NeedPair>{(ctx) => <ChatView {...ctx} />}</NeedPair></Page>,
});

type Ctx = Parameters<Parameters<typeof NeedPair>[0]["children"]>[0];
type Msg = { sender: "rue" | "a" | "b"; content: string };
const MOODS = [
  { id: "date_night_in", label: "Date night in" }, { id: "getting_to_know_you", label: "Getting to know you" },
  { id: "long_distance", label: "Long distance" }, { id: "road_trip", label: "Road trip" }, { id: "dinner_table", label: "Dinner table" },
];

function ChatView({ me, active }: Ctx) {
  const run = useServerFn(chatTurn);
  const [mood, setMood] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [game, setGame] = useState<ChatTurn["game"]>(null);
  const [scores, setScores] = useState({ a: 0, b: 0 });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => { if (!busy) ta.current?.focus(); }, [busy, mood]);

  const turn = async (history: Msg[], m = mood!) => {
    setBusy(true); setErr("");
    try {
      const r = await run({ data: { a: me, b: active.profile, mood: m, history, scores } });
      const next = [...history, ...r.turn.messages];
      setMsgs(next); setGame(r.turn.game); setScores(r.turn.points);
      setState((s) => ({ ...s, lastChat: { mood: m, scores: r.turn.points, highlight: r.turn.messages.at(-1)?.content ?? "" } }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const send = (text: string) => { if (!text.trim() || busy) return; const h = [...msgs, { sender: "a" as const, content: text.trim() }]; setMsgs(h); setInput(""); turn(h); };

  if (!mood) return (
    <>
      <PageTitle eyebrow="Chat with Rue" title="Pick a mood" sub={active.demo ? `Rue plays ${active.profile.name} from their real tastes, so you can try every game solo.` : `Rue answers for ${active.profile.name} from their taste profile until they join.`} />
      <div className="grid gap-3 md:grid-cols-3">
        {MOODS.map((m) => <button key={m.id} onClick={() => { setMood(m.id); turn([], m.id); }} className="card-luxe p-6 text-left font-display text-2xl transition hover:border-primary">{m.label}</button>)}
      </div>
    </>
  );

  const name = (s: Msg["sender"]) => (s === "a" ? me.name : s === "b" ? active.profile.name : "Rue");
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_220px]">
      <div className="card-luxe flex h-[70vh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.sender === "a" ? "flex-row-reverse" : ""}`}>
              {m.sender === "rue" ? <RueAvatar size={36} /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">{name(m.sender)[0]}</span>}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${m.sender === "a" ? "bg-primary text-primary-foreground" : m.sender === "rue" ? "bg-secondary font-display text-lg italic text-secondary-foreground" : "bg-muted"}`}>
                <p className="text-[10px] uppercase tracking-widest opacity-70">{name(m.sender)}</p>{m.content}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Rue is shuffling the cards…</div>}
          <div ref={end} />
        </div>
        {game && (
          <div className="border-t p-4">
            <p className="text-xs uppercase tracking-widest text-gold">{game.type.replace(/_/g, " ")}</p>
            <p className="font-display text-xl">{game.prompt}</p>
            {game.options.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{game.options.map((o) => <Button key={o} size="sm" variant="outline" disabled={busy} onClick={() => send(o)}>{o}</Button>)}</div>}
          </div>
        )}
        <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Textarea ref={ta} rows={1} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Your answer…" className="min-h-10 resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
        </form>
        {err && <div className="p-3"><ErrorNote msg={err} /></div>}
      </div>
      <aside className="space-y-4">
        <div className="card-luxe p-5">
          <p className="text-xs uppercase tracking-widest text-gold">Scoreboard</p>
          <p className="mt-2 flex justify-between font-display text-2xl"><span>{me.name}</span><span>{scores.a}</span></p>
          <p className="flex justify-between font-display text-2xl"><span>{active.profile.name}</span><span>{scores.b}</span></p>
        </div>
        <Button variant="outline" className="w-full" asChild><Link to="/recap">Recap card</Link></Button>
        <Button variant="ghost" className="w-full" onClick={() => { setMood(null); setMsgs([]); setGame(null); setScores({ a: 0, b: 0 }); }}>Change mood</Button>
      </aside>
    </div>
  );
}

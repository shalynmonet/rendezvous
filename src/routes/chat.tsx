import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote, NeedPair, Page, PageTitle, RueAvatar } from "@/components/rue";
import { chatTurn, type ChatTurn } from "@/lib/rue.functions";
import { canVoicePartner, setState, saveChat, selectedChat, type ChatMessage, type SavedChat } from "@/lib/store";
import { LiveChat } from "@/components/live-chat";
import { ChatSave } from "@/components/chat-save";
import { WaitingForPartner } from "@/components/waiting-for-partner";

import { groupPeople, personQualifier } from "@/lib/person-identity";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Chat with Ru — Rendezvous" },
      { name: "description", content: "Ru hosts taste-based games for two." },
      { property: "og:title", content: "Chat with Ru — Rendezvous" },
      {
        property: "og:description",
        content: "This or That, Defend Your Pick, Deep Cuts and more.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const [picked, setPicked] = useState(false);
  return (
    <Page>
      <Button variant="ghost" className="mb-4" asChild><Link to="/saved-chats">Saved chats</Link></Button>
      <NeedPair>
        {(ctx) =>
          !picked ? (
            <PartnerPicker {...ctx} onPick={(id) => { setState((st) => ({ ...st, activeId: id })); setPicked(true); }} />
          ) : ctx.active.room ? (
            <>
              <Button variant="ghost" className="mb-2" onClick={() => setPicked(false)}>← Choose someone else</Button>
              <LiveChat key={ctx.active.room.id} room={ctx.active.room} />
            </>
          ) : (
            <>
              <Button variant="ghost" className="mb-2" onClick={() => setPicked(false)}>← Choose someone else</Button>
              {!canVoicePartner(ctx.active) && <WaitingForPartner partner={ctx.active.profile} me={ctx.me} compact />}
              <ChatView key={ctx.active.id} {...ctx} />
            </>
          )
        }
      </NeedPair>
    </Page>
  );
}

/** Chat starts by asking who you're talking to; each person has one ongoing thread. */
function PartnerPicker({ s, onPick }: Ctx & { onPick: (id: string) => void }) {
  // One card per person: duplicate invites and saved snapshots merge, but two
  // different people who happen to share a name stay on separate cards.
  const has = (t?: SavedChat) => !!t && t.messages.length > 0;
  const cards = groupPeople(s.connections).map((group) => {
    const threads = group.members.map((c) => ({ c, thread: selectedChat(s, c.id) }));
    const withThread = threads
      .filter((t) => has(t.thread))
      .sort((a, b) => b.thread!.updatedAt.localeCompare(a.thread!.updatedAt));
    return { group, ...(withThread[0] ?? threads.find((t) => !!t.c.room) ?? threads[0]!) };
  });
  const clash = cards.some((card) => card.group.clash);
  return (
    <>
      <PageTitle eyebrow="Chat with Ru" title="Who are we chatting with tonight?" sub="Each person has one ongoing thread. Ru picks up right where you left off." />
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map(({ group, c, thread }) => {
          const mood = thread ? MOODS.find((m) => m.id === thread.mood)?.label ?? thread.mood : null;
          const waiting = !c.room && !canVoicePartner(c);
          return (
            <Button key={c.id} variant="outline" className="h-auto flex-col items-start whitespace-normal p-5 text-left" onClick={() => onPick(c.id)}>
              <span className="font-display text-2xl">{c.profile.name}{group.clash && <span className="text-sm text-gold"> · {personQualifier(c.profile, { label: c.label, addedAt: c.addedAt })}</span>} {c.demo && <span className="text-xs text-gold">demo</span>}{c.room && <span className="text-xs text-gold"> live</span>}</span>
              <span className="text-xs text-muted-foreground">
                {thread && thread.messages.length > 0 ? `${c.profile.name} · ${mood} · ${new Date(thread.updatedAt).toLocaleDateString()}` : c.room ? "Live chat room" : waiting ? `Waiting for ${c.profile.name} to join live` : "No thread yet — pick a mood next"}
              </span>
              {waiting && thread && thread.messages.length > 0 && <span className="text-xs text-gold">Waiting for {c.profile.name} to join live</span>}

            </Button>
          );
        })}
      </div>
      {clash && <p className="mt-3 text-xs text-muted-foreground">Two of your people share a name — the detail beside it tells them apart.</p>}
      <Button variant="ghost" className="mt-4" asChild><Link to="/connections">+ Invite someone new</Link></Button>
    </>
  );
}

type Ctx = Parameters<Parameters<typeof NeedPair>[0]["children"]>[0];
type Msg = ChatMessage;
const MOODS = [
  { id: "date_night_in", label: "Date night in" },
  { id: "getting_to_know_you", label: "Getting to know you" },
  { id: "long_distance", label: "Long distance" },
  { id: "road_trip", label: "Road trip" },
  { id: "dinner_table", label: "Dinner table" },
];

function ChatView({ me, active, s }: Ctx) {
  const run = useServerFn(chatTurn);
  const initial = selectedChat(s, active.id);
  const [chatId, setChatId] = useState<string | null>(initial?.id ?? (canVoicePartner(active) ? null : crypto.randomUUID()));
  const waiting = !canVoicePartner(active);
  const [mood, setMood] = useState<string | null>(initial?.mood ?? (waiting ? "waiting" : null));
  const [msgs, setMsgs] = useState<Msg[]>(initial?.messages ?? []);
  const [game, setGame] = useState<SavedChat["game"]>(initial?.game ?? null);
  const [scores, setScores] = useState(initial?.scores ?? { a: 0, b: 0 });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(initial?.muted ?? false);
  const mutedRef = useRef(initial?.muted ?? false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);
  useEffect(() => {
    if (!busy) ta.current?.focus();
  }, [busy, mood]);

  const [resetAt, setResetAt] = useState(initial?.resetAt ?? 0);
  const [lastMood, setLastMood] = useState<string | null>(null);
  const resetRef = useRef(initial?.resetAt ?? 0);
  const persist = (id: string, m: string, messages: Msg[], nextGame = game, points = scores) => {
    setState((state) => saveChat(state, active.id, { id, mood: m, messages, game: nextGame, scores: points, muted: mutedRef.current, resetAt: resetRef.current, updatedAt: new Date().toISOString() }));
  };
  const turn = async (history: Msg[], m = mood, id = chatId, points = scores, currentGame = game) => {
    if (!m || !id || waiting) return;
    setBusy(true);
    setErr("");
    try {
      const r = await run({ data: { a: me, b: active.profile, mood: m, history: history.slice(resetRef.current), scores: points, game: currentGame, partnerIsDemo: canVoicePartner(active) } });
      if (mutedRef.current) return;
      const next = [...history, ...r.turn.messages];
      setMsgs(next);
      setGame(r.turn.game);
      setScores(r.turn.points);
      persist(id, m, next, r.turn.game, r.turn.points);
      setState((s) => ({
        ...s,
        lastChat: {
          mood: m,
          scores: r.turn.points,
          highlight: r.turn.messages.at(-1)?.content ?? "",
        },
      }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const send = (text: string) => {
    if (!text.trim() || busy || !mood || !chatId) return;
    const h = [...msgs, { sender: "a" as const, content: text.trim() }];
    setMsgs(h);
    persist(chatId, mood, h);
    setInput("");
    if (!mutedRef.current) void turn(h);
  };

  if (!mood)
    return (
      <>
        <PageTitle
          eyebrow="Chat with Ru"
          title={msgs.length ? "Fresh start — pick a mood" : "Pick a mood"}
          sub={`Ru plays ${active.profile.name} from their real tastes, so you can try every game solo.`}

        />
        <div className="grid gap-3 md:grid-cols-3">
          {MOODS.map((m) => (
            <Button variant="outline"
              key={m.id}
              onClick={() => {
                // Same thread per person: a fresh start keeps earlier messages visible.
                const id = chatId ?? crypto.randomUUID();
                resetRef.current = msgs.length; setResetAt(msgs.length);
                setMood(m.id); setChatId(id); setGame(null); setScores({ a: 0, b: 0 });
                persist(id, m.id, msgs, null, { a: 0, b: 0 });
                void turn(msgs, m.id, id, { a: 0, b: 0 }, null);
              }}
              className="h-auto justify-start p-6 text-left font-display text-2xl"
            >
              {m.label}
            </Button>
          ))}
        </div>
        {msgs.length > 0 && lastMood && <Button variant="ghost" className="mt-4" onClick={() => setMood(lastMood)}>Back to our thread</Button>}
        <div className="mt-6 max-w-sm"><ChatSave /></div>
      </>
    );

  const name = (s: Msg["sender"]) =>
    s === "a" ? me.name : s === "b" ? active.profile.name : "Ru";
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_220px]">
      <div className="card-luxe flex h-[70vh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {msgs.map((m, i) => (
            <div key={i} className="contents">
            {i === resetAt && i > 0 && <p className="text-center text-xs uppercase tracking-widest text-gold">Fresh start · {MOODS.find((x) => x.id === mood)?.label ?? mood}</p>}
            <div className={`flex gap-3 ${m.sender === "a" ? "flex-row-reverse" : ""}`}>
              {m.sender === "rue" ? (
                <RueAvatar size={36} />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {name(m.sender)[0]}
                </span>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${m.sender === "a" ? "bg-primary text-primary-foreground" : m.sender === "rue" ? "bg-secondary font-display text-lg italic text-secondary-foreground" : "bg-muted"}`}
              >
                <p className="text-[10px] uppercase tracking-widest opacity-70">{name(m.sender)}</p>
                {m.content}
              </div>
            </div>
            </div>
          ))}
          {waiting && (
            <div className="flex gap-3" role="status">
              <RueAvatar size={36} />
              <div className="max-w-[75%] rounded-2xl bg-secondary px-4 py-2 font-display text-lg italic text-secondary-foreground">
                <p className="text-[10px] uppercase tracking-widest opacity-70">Ru</p>
                We&rsquo;re waiting on {active.profile.name} to join. Leave a note if you like — I&rsquo;ll start hosting the moment they&rsquo;re here.
              </div>
            </div>
          )}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ru is shuffling the cards…
            </div>
          )}
          <div ref={end} />
        </div>
        {game && (
          <div className="border-t p-4">
            <p className="text-xs uppercase tracking-widest text-gold">
              {game.type.replace(/_/g, " ")}
            </p>
            <p className="font-display text-xl">{game.prompt}</p>
            {game.options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {game.options.map((o) => (
                  <Button
                    key={o}
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => send(o)}
                  >
                    {o}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
        <form
          className="flex gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Textarea
            ref={ta}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer…"
            className="min-h-10 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {err && (
          <div className="p-3">
            <ErrorNote msg={err} />
          </div>
        )}
      </div>
      <aside className="space-y-4">
        {!waiting && <Button variant={muted ? "outline" : "secondary"} className="w-full" aria-pressed={muted} onClick={() => {
          mutedRef.current = !mutedRef.current; setMuted(mutedRef.current);
          if (chatId && mood) persist(chatId, mood, msgs);
          if (!mutedRef.current) void turn(msgs);
        }}>
          {muted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}{muted ? "Unmute Ru" : "Mute Ru"}
        </Button>}
        <ChatSave disabled={busy} snapshot={chatId && mood ? { sourceId: `local:${chatId}`, kind: active.demo ? "demo" : "local", a: me, b: active.profile, mood, messages: msgs, game, scores } : undefined} />
        <div className="card-luxe p-5">
          <p className="text-xs uppercase tracking-widest text-gold">Scoreboard</p>
          <p className="mt-2 flex justify-between font-display text-2xl">
            <span>{me.name}</span>
            <span>{scores.a}</span>
          </p>
          <p className="flex justify-between font-display text-2xl">
            <span>{active.profile.name}</span>
            <span>{scores.b}</span>
          </p>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <Link to="/recap">Recap card</Link>
        </Button>
        {!waiting && <div className="card-luxe p-4 text-sm">
          <p className="text-xs uppercase tracking-widest text-gold">Mood</p>
          <p className="font-display text-xl">{MOODS.find((x) => x.id === mood)?.label ?? mood}</p>
          <Button variant="outline" className="mt-2 w-full" disabled={busy} onClick={() => { setLastMood(mood); setMood(null); }}>
            Switch mood
          </Button>
        </div>}
      </aside>
    </div>
  );
}

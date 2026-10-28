import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote, NeedPair, Page, PageTitle, RueAvatar } from "@/components/rue";
import { chatTurn, type ChatTurn } from "@/lib/rue.functions";
import { setState, saveChat, selectedChat, type ChatMessage, type SavedChat } from "@/lib/store";
import { LiveChat } from "@/components/live-chat";
import { ChatSave } from "@/components/chat-save";

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
  component: () => (
    <Page>
      <Button variant="ghost" className="mb-4" asChild><Link to="/saved-chats">Saved chats</Link></Button>
      <NeedPair>
        {(ctx) =>
          ctx.active.room ? (
            <LiveChat key={ctx.active.room.id} room={ctx.active.room} />
          ) : (
            <ChatView key={ctx.active.id} {...ctx} />
          )
        }
      </NeedPair>
    </Page>
  ),
});

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
  const [chatId, setChatId] = useState<string | null>(initial?.id ?? null);
  const [mood, setMood] = useState<string | null>(initial?.mood ?? null);
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

  const persist = (id: string, m: string, messages: Msg[], nextGame = game, points = scores) => {
    setState((state) => saveChat(state, active.id, { id, mood: m, messages, game: nextGame, scores: points, muted: mutedRef.current, updatedAt: new Date().toISOString() }));
  };
  const restore = (chat: SavedChat) => {
    mutedRef.current = chat.muted ?? false; setMuted(mutedRef.current);
    setChatId(chat.id); setMood(chat.mood); setMsgs(chat.messages); setGame(chat.game); setScores(chat.scores); setErr(""); setInput("");
    setState((state) => ({ ...state, selectedChats: { ...state.selectedChats, [active.id]: chat.id } }));
  };
  const history = (s.chats?.[active.id] ?? []).filter((chat) => chat.messages.length > 0);
  const historyList = history.length > 0 && (
    <section className="space-y-2">
      <h2 className="font-display text-2xl">Chat history</h2>
      {[...history].reverse().map((chat) => (
        <Button key={chat.id} variant={chat.id === chatId ? "secondary" : "outline"} disabled={busy} className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => restore(chat)}>
          {MOODS.find((m) => m.id === chat.mood)?.label ?? chat.mood} · {new Date(chat.updatedAt).toLocaleDateString()}
        </Button>
      ))}
    </section>
  );
  const turn = async (history: Msg[], m = mood, id = chatId, points = scores, currentGame = game) => {
    if (!m || !id) return;
    setBusy(true);
    setErr("");
    try {
      const r = await run({ data: { a: me, b: active.profile, mood: m, history, scores: points, game: currentGame } });
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
          title="Pick a mood"
          sub={
            active.demo
              ? `Ru plays ${active.profile.name} from their real tastes, so you can try every game solo.`
              : `Ru answers for ${active.profile.name} from their taste profile until they join.`
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          {MOODS.map((m) => (
            <Button variant="outline"
              key={m.id}
              onClick={() => {
                setMood(m.id);
                const id = crypto.randomUUID();
                setChatId(id);
                persist(id, m.id, [], null, { a: 0, b: 0 });
                void turn([], m.id, id, { a: 0, b: 0 }, null);
              }}
              className="h-auto justify-start p-6 text-left font-display text-2xl"
            >
              {m.label}
            </Button>
          ))}
        </div>
        <div className="mt-6">{historyList}</div>
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
            <div key={i} className={`flex gap-3 ${m.sender === "a" ? "flex-row-reverse" : ""}`}>
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
          ))}
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
        <Button variant={muted ? "outline" : "secondary"} className="w-full" aria-pressed={muted} onClick={() => {
          mutedRef.current = !mutedRef.current; setMuted(mutedRef.current);
          if (chatId && mood) persist(chatId, mood, msgs);
          if (!mutedRef.current) void turn(msgs);
        }}>
          {muted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}{muted ? "Unmute Ru" : "Mute Ru"}
        </Button>
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
        <Button
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setState((state) => ({ ...state, selectedChats: { ...state.selectedChats, [active.id]: null } }));
            setChatId(null);
            mutedRef.current = false; setMuted(false);
            setMood(null);
            setMsgs([]);
            setGame(null);
            setScores({ a: 0, b: 0 });
          }}
        >
          New chat
        </Button>
        {historyList}
      </aside>
    </div>
  );
}

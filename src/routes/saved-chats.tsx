import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount } from "@/components/account-provider";
import { Button } from "@/components/ui/button";
import { Page, PageTitle, ErrorNote, RueAvatar } from "@/components/rue";
import { listAccountChats } from "@/lib/saved-chat.functions";

export const Route = createFileRoute("/saved-chats")({
  head: () => ({ meta: [
    { title: "Saved chats — Rendezvous" }, { name: "description", content: "Your private saved conversations with Ru and your people." },
    { property: "og:title", content: "Saved chats — Rendezvous" }, { property: "og:description", content: "Revisit your saved Rendezvous conversations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SavedChats,
});

function SavedChats() {
  const { user, ready } = useAccount();
  const read = useServerFn(listAccountChats);
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["account-chats", user?.id], queryFn: () => read(), enabled: !!user });
  const chats = user ? query.data ?? [] : [];
  const current = chats.find((chat) => chat.id === selected) ?? chats[0];
  const savedTime = (at: string) => new Date(at).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" });
  return <Page><PageTitle eyebrow="Your account" title="Saved chats" />
    {!ready ? <p>Opening your account…</p> : !user ? <Button asChild><Link to="/auth">Create an account to save</Link></Button> : <>
      {query.isPending && <p>Loading your chats…</p>}
      {query.error && <ErrorNote msg={query.error.message} />}
      {!query.isPending && !query.error && !chats.length && <p>No saved chats yet.</p>}
      {current && <div className="grid min-w-0 gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-2">{chats.map((chat) => <Button key={chat.id} variant={chat.id === current.id ? "secondary" : "outline"} className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => setSelected(chat.id)}>
          <span className="min-w-0 break-words">{chat.snapshot.a.name} &amp; {chat.snapshot.b?.name ?? "your person"}<span className="mt-1 block text-xs">{chat.snapshot.kind === "demo" ? "Demo" : "Chat"} · {chat.snapshot.messages.length} messages</span><time className="mt-1 block text-xs font-normal" dateTime={chat.updatedAt}>Saved {savedTime(chat.updatedAt)}</time></span>
        </Button>)}</aside>
        <section className="min-w-0 space-y-4">
          <h2 className="text-3xl">{current.snapshot.a.name} &amp; {current.snapshot.b?.name ?? "your person"}</h2>
          {current.snapshot.mood && <p className="text-sm capitalize text-gold">{current.snapshot.mood.replaceAll("_", " ")}</p>}
          <time className="block text-sm text-muted-foreground" dateTime={current.updatedAt}>Saved {savedTime(current.updatedAt)}</time>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-y py-4" aria-label="Saved scoreboard">
            <h3 className="text-xs uppercase text-gold">Scoreboard</h3>
            <p>{current.snapshot.a.name} <strong className="ml-2 text-xl">{current.snapshot.scores.a}</strong></p>
            <p>{current.snapshot.b?.name ?? "Your person"} <strong className="ml-2 text-xl">{current.snapshot.scores.b}</strong></p>
          </div>
          <h3 className="font-display text-2xl">Full conversation <span className="text-sm text-muted-foreground">· {current.snapshot.messages.length} messages</span></h3>
          <div className="space-y-4" aria-label="Saved conversation">
            {current.snapshot.messages.map((message, i) => <div key={`${current.id}:${i}`} className={`flex min-w-0 items-start gap-3 ${message.sender === "a" ? "flex-row-reverse" : ""}`}>
              {message.sender === "rue" ? <RueAvatar size={32} /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">{(message.sender === "a" ? current.snapshot.a.name : current.snapshot.b?.name ?? "?").slice(0, 1)}</span>}
              <div className={`min-w-0 max-w-[85%] rounded-lg px-4 py-3 ${message.sender === "a" ? "bg-primary text-primary-foreground" : message.sender === "rue" ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>
                <p className="mb-1 text-xs opacity-70">{message.sender === "rue" ? "Ru" : message.sender === "a" ? current.snapshot.a.name : current.snapshot.b?.name}</p>
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
              </div>
            </div>)}
          </div>
          {current.snapshot.game && <div className="space-y-2 border-t pt-4"><h3 className="text-xs uppercase text-gold">Game at save time</h3><p className="font-display text-xl">{current.snapshot.game.prompt}</p><p className="text-sm text-muted-foreground">{current.snapshot.game.options.join(" · ")}</p></div>}
        </section>
      </div>}
    </>}
  </Page>;
}
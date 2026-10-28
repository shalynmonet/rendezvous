import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount } from "@/components/account-provider";
import { Button } from "@/components/ui/button";
import { Page, PageTitle, ErrorNote } from "@/components/rue";
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
  return <Page><PageTitle eyebrow="Your account" title="Saved chats" />
    {!ready ? <p>Opening your account…</p> : !user ? <Button asChild><Link to="/auth">Create an account to save</Link></Button> : <>
      {query.isPending && <p>Loading your chats…</p>}
      {query.error && <ErrorNote msg={query.error.message} />}
      {!query.isPending && !query.error && !chats.length && <p>No saved chats yet.</p>}
      {current && <div className="grid min-w-0 gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-2">{chats.map((chat) => <Button key={chat.id} variant={chat.id === current.id ? "secondary" : "outline"} className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => setSelected(chat.id)}>
          <span>{chat.snapshot.a.name} &amp; {chat.snapshot.b?.name ?? "your person"}<span className="block text-xs">{chat.snapshot.kind === "demo" ? "Demo" : "Chat"} · {new Date(chat.updatedAt).toLocaleDateString()}</span></span>
        </Button>)}</aside>
        <section className="min-w-0 space-y-4">
          <h2 className="text-3xl">{current.snapshot.a.name} &amp; {current.snapshot.b?.name ?? "your person"}</h2>
          <p className="text-sm text-gold">{current.snapshot.mood?.replaceAll("_", " ")} · {current.snapshot.scores.a} – {current.snapshot.scores.b}</p>
          {current.snapshot.messages.map((message, i) => <div key={i} className="border-b py-3">
            <p className="text-xs text-gold">{message.sender === "rue" ? "Ru" : message.sender === "a" ? current.snapshot.a.name : current.snapshot.b?.name}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p>
          </div>)}
          {current.snapshot.game && <p className="font-display text-xl">{current.snapshot.game.prompt}</p>}
        </section>
      </div>}
    </>}
  </Page>;
}
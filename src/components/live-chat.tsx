import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { ErrorNote, RueAvatar } from "@/components/rue";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader, ToolContent, ToolOutput } from "@/components/ai-elements/tool";
import { chatAccess } from "@/lib/guest-chat.functions";
import type { GuestRoom, LiveState } from "@/lib/chat-schemas";
import { setState } from "@/lib/store";
import { ChatSave } from "./chat-save";

export function LiveChat({ room }: { room: GuestRoom }) {
  const access = useServerFn(chatAccess);
  const [state, setLive] = useState<LiveState | null>(null);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hosting, setHosting] = useState(false);
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null);
  const [mood, setMood] = useState("getting_to_know_you");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const refresh = useCallback(async () => {
    const r = await access({ data: { action: "read", room: room.id, token: room.token } });
    if (r.state) {
      setLive(r.state);
      setState((s) => ({
        ...s,
        lastChat: {
          mood: r.state?.mood ?? mood,
          scores: r.state?.scores ?? { a: 0, b: 0 },
          highlight: r.state?.messages.at(-1)?.content ?? "",
        },
      }));
    }
  }, [access, room.id, room.token, mood]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const poll = async () => {
      try {
        await refresh();
        failures = 0;
      } catch (e) {
        failures++;
        if (failures >= 3) {
          setError((e as Error).message);
          return;
        }
      }
      if (!stopped) timer = setTimeout(poll, document.hidden ? 8000 : 2000);
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (!sending) textarea.current?.focus();
  }, [sending]);
  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    const msg =
      pending?.text === text.trim() ? pending : { id: crypto.randomUUID(), text: text.trim() };
    setPending(msg);
    setSending(true);
    setError("");
    try {
      const r = await access({
        data: {
          action: "send",
          room: room.id,
          token: room.token,
          text: msg.text,
          messageId: msg.id,
        },
      });
      if (r.state) setLive(r.state);
      setPending(null);
      setInput("");
    } catch (e) {
      setError((e as Error).message);
      setInput(text);
    } finally {
      setSending(false);
    }
  };
  const host = async () => {
    if (hosting) return;
    setHosting(true);
    setError("");
    try {
      const response = await fetch("/api/public/live-host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: room.id, token: room.token, mood }),
      });
      if (!response.ok) {
        const r = await response.json();
        throw new Error(r.error || "Ru could not start.");
      }
      if (response.headers.get("content-type")?.includes("application/json")) {
        await refresh();
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Ru’s connection was interrupted.");
      let buffer = "";
      const decoder = new TextDecoder();
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.error) throw new Error(event.error);
        }
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setHosting(false);
    }
  };
  if (!state)
    return (
      <div className="space-y-4">
        <RueAvatar />
        <p>Opening your shared chat…</p>
        {error && <ErrorNote msg={error} />}
      </div>
    );
  const other = state.side === "a" ? state.b?.name : state.a.name;
  const lastRue = state.messages.reduce((last, m, i) => (m.sender === "rue" ? i : last), -1);
  const answers = state.messages.slice(lastRue + 1);
  const both = answers.some((m) => m.sender === "a") && answers.some((m) => m.sender === "b");
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-4xl">
          {state.a.name} &amp; {state.b?.name ?? "your person"}
        </h1>
        <p className="mt-2 text-sm text-gold">
          {state.b ? "Live conversation · Ru hosts, you both answer" : "Waiting for your person"}
        </p>
      </header>
      <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex h-[min(760px,80dvh)] min-h-[400px] min-w-0 flex-col border-y">
          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="gap-4 p-3">
              {state.messages.map((m, i) => (
                <Message key={m.id} from={m.sender === state.side ? "user" : "assistant"}>
                  <MessageContent
                    className={
                      m.sender === state.side
                        ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                        : ""
                    }
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {m.sender === "rue" && <RueAvatar size={28} />}
                      <span>
                        {m.sender === "rue"
                          ? "Ru"
                          : m.sender === "a"
                            ? state.a.name
                            : state.b?.name}
                      </span>
                    </div>
                    <MessageResponse>{m.content}</MessageResponse>
                    {m.sender === "rue" && i === lastRue && state.tools.length > 0 && (
                      <Tool defaultOpen={false}>
                        <ToolHeader
                          type="dynamic-tool"
                          toolName="qloo"
                          title="Taste evidence"
                          state="output-available"
                        />
                        <ToolContent>
                          <ToolOutput errorText={undefined} output={state.tools.join(", ")} />
                        </ToolContent>
                      </Tool>
                    )}
                  </MessageContent>
                </Message>
              ))}
              {pending && !state.messages.some((m) => m.id === pending.id) && (
                <Message from="user">
                  <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                    <MessageResponse>{pending.text}</MessageResponse>
                    <p className="text-xs">{sending ? "Sending…" : "Not sent yet"}</p>
                  </MessageContent>
                </Message>
              )}
              {(hosting || state.busy) && (
                <div className="flex items-center gap-2">
                  <RueAvatar size={28} />
                  <Shimmer>Ru is finding your next game…</Shimmer>
                </div>
              )}
              {!state.messages.length && (
                <p className="text-sm text-muted-foreground">
                  {state.b
                    ? `Bonjour, ${state.a.name} and ${state.b.name}.`
                    : "Your person has not joined yet."}
                </p>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          {state.game && (
            <div className="space-y-2 border-t p-3">
              <p className="text-xs uppercase text-gold">{state.game.type.replaceAll("_", " ")}</p>
              <p className="font-display text-xl">{state.game.prompt}</p>
              <div className="flex flex-wrap gap-2">
                {state.game.options.map((o, i) => (
                  <Button
                    className="h-auto whitespace-normal text-left"
                    key={i}
                    size="sm"
                    variant="outline"
                    disabled={sending}
                    onClick={() => send(o)}
                  >
                    {o}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="border-t py-3">
            <PromptInput onSubmit={async ({ text }) => send(text)}>
              <PromptInputTextarea
                ref={textarea}
                autoFocus
                aria-label="Your message"
                placeholder={`Message ${other ?? "your person"}…`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                disabled={!state.b}
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit
                  aria-label="Send"
                  status={sending ? "submitted" : "ready"}
                  disabled={sending || !input.trim() || !state.b}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
        <aside className="min-w-0 space-y-4">
          <ChatSave room={room} disabled={sending || hosting || state.busy} snapshot={{ sourceId: `live:${state.id}`, kind: "live", a: state.a, b: state.b, mood: state.mood, messages: state.messages.map(({ sender, content }) => ({ sender, content })), game: state.game, scores: state.scores }} />
          <h2 className="text-2xl">Scoreboard</h2>
          <p className="flex justify-between gap-3">
            <span className="break-words">{state.a.name}</span>
            <span>{state.scores.a}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="break-words">{state.b?.name ?? "Your person"}</span>
            <span>{state.scores.b}</span>
          </p>
          {!state.mood && (
            <select
              aria-label="Chat mood"
              className="w-full rounded-md border bg-background p-2"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              <option value="getting_to_know_you">Getting to know you</option>
              <option value="date_night_in">Date night in</option>
              <option value="long_distance">Long distance</option>
              <option value="road_trip">Road trip</option>
              <option value="dinner_table">Dinner table</option>
            </select>
          )}
          <Button
            className="h-auto w-full whitespace-normal"
            disabled={!state.b || hosting || state.busy || !!state.error || (!both && !!state.game)}
            onClick={host}
          >
            {state.game ? "Ru, next game" : "Start a game with Ru"}
          </Button>
          {state.game && !both && (
            <p className="text-sm text-muted-foreground">Waiting for both answers.</p>
          )}
          {(error || state.error) && <ErrorNote msg={error || state.error || ""} />}
          <Button
            variant="ghost"
            onClick={() => {
              setError("");
              void refresh().catch((e) => setError(e.message));
            }}
          >
            Refresh conversation
          </Button>
        </aside>
      </div>
    </section>
  );
}

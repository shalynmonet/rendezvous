import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Heart, Sparkle, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { tasteReveal, type Reveal } from "@/lib/rue.functions";
import { setState, storeSnapshot } from "@/lib/store";

export const Route = createFileRoute("/reveal")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Taste Reveal — Rendezvous" },
      {
        name: "description",
        content:
          "Common ground, bridges and wildcards between two people, from Qloo's taste graph.",
      },
      { property: "og:title", content: "Taste Reveal — Rendezvous" },
      { property: "og:description", content: "See what you share." },
    ],
  }),
  component: () => (
    <Page>
      <NeedPair>{(ctx) => <RevealView key={ctx.active.id} {...ctx} />}</NeedPair>
    </Page>
  ),
});

type Ctx = Parameters<Parameters<typeof NeedPair>[0]["children"]>[0];

function RevealView({ me, active }: Ctx) {
  const run = useServerFn(tasteReveal);
  const [data, setData] = useState<{
    reveal: Reveal;
    toolsUsed: string[];
    evidence: { shared_taste_tags: string[] };
  } | null>(() => (storeSnapshot().reveals?.[active.id] as { reveal: Reveal; toolsUsed: string[]; evidence: { shared_taste_tags: string[] } } | undefined) ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await run({ data: { a: me, b: active.profile } });
      setData(r);
      setState((s) => ({
        ...s,
        reveals: { ...s.reveals, [active.id]: r },
        me: s.me && { ...s.me, tastes: r.a.tastes },
        connections: s.connections.map((c) =>
          c.id === active.id ? { ...c, profile: { ...c.profile, tastes: r.b.tastes } } : c,
        ),
      }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const Section = ({
    icon: Icon,
    title,
    items,
  }: {
    icon: typeof Heart;
    title: string;
    items: Reveal["common_ground"];
  }) => (
    <div className="card-luxe p-6">
      <div className="flex items-center gap-2 text-gold">
        <Icon className="h-5 w-5" />
        <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="mt-4 space-y-5">
        {items.map((i, k) => (
          <div key={k}>
            <p className="font-display text-2xl">{i.title}</p>
            <WhyChip>{i.reason}</WhyChip>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <PageTitle
        eyebrow="The Taste Reveal"
        title={`${me.name} & ${active.profile.name}`}
        sub="Ru compares both taste graphs and finds the overlap, the bridges, and the dares."
      />
      {!data && !busy && (
        <div className="card-luxe space-y-4 p-6">
          <RueSays>I've kept your secrets so far. Shall I reveal what you two share?</RueSays>
          <Button size="lg" onClick={go}>
            Reveal our tastes
          </Button>
        </div>
      )}
      {busy && <RueThinking />}
      {err && <ErrorNote msg={err} />}
      {data && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gold/35">
            <div className="rounded-xl bg-card p-8 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-gold">Voilà</p>
              <h2 className="mt-2 text-5xl font-semibold italic">{data.reveal.headline}</h2>
              <p className="mt-3 font-display text-xl text-muted-foreground">
                “{data.reveal.rue_line}”
              </p>
              {data.evidence.shared_taste_tags.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {data.evidence.shared_taste_tags.slice(0, 8).map((t) => (
                    <span key={t} className="rounded-full border border-gold/40 px-3 py-1 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Section icon={Heart} title="Common ground" items={data.reveal.common_ground} />
          <div className="grid gap-6 md:grid-cols-2">
            <Section icon={Sparkle} title="Bridges" items={data.reveal.bridges} />
            <Section icon={Shuffle} title="Wildcards" items={data.reveal.wildcards} />
          </div>
          <ToolTrail tools={data.toolsUsed} />
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/plan">Plan a date from this</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/chat">Play a game</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

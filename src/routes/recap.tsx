import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NeedPair, Page, PageTitle, RUE_IMG } from "@/components/rue";
import type { Plan } from "@/lib/rue.functions";

export const Route = createFileRoute("/recap")({
  head: () => ({
    meta: [
      ...(RUE_IMG.startsWith("https://")
        ? [
            { property: "og:image", content: RUE_IMG },
            { name: "twitter:image", content: RUE_IMG },
          ]
        : []),
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Recap — Rendezvous" },
      { name: "description", content: "A shareable summary of your Rendezvous." },
      { property: "og:title", content: "Our Rendezvous recap" },
      { property: "og:description", content: "Ru knows." },
    ],
  }),
  component: () => (
    <Page>
      <NeedPair>{(ctx) => <RecapView {...ctx} />}</NeedPair>
    </Page>
  ),
});

type Ctx = Parameters<Parameters<typeof NeedPair>[0]["children"]>[0];

function RecapView({ me, active, s }: Ctx) {
  const plan = s.lastPlan as Plan | undefined;
  const chat = s.lastChat;
  const text = [
    `Rendezvous: ${me.name} & ${active.profile.name}`,
    plan && `${plan.title}: ${plan.stops.map((x) => x.name).join(" → ")}`,
    chat && `Game score ${chat.scores.a}–${chat.scores.b}`,
    "Ru knows.",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <>
      <PageTitle eyebrow="Recap" title="Your Rendezvous card" />
      {!plan && !chat ? (
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/plan">Plan a date first</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/chat">Or play a game</Link>
          </Button>
        </div>
      ) : (
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border border-gold/35 shadow-candle">
            <div className="overflow-hidden rounded-[1.25rem] bg-card">
              <img src={RUE_IMG} alt="" className="h-44 w-full object-cover object-[70%_30%]" />
              <div className="space-y-4 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-gold">A Rendezvous</p>
                <h2 className="text-4xl font-semibold italic">
                  {me.name} & {active.profile.name}
                </h2>
                {plan && (
                  <div>
                    <p className="font-display text-xl">{plan.title}</p>
                    {plan.stops.map((x, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {i + 1}. {x.name}
                      </p>
                    ))}
                  </div>
                )}
                {chat && (
                  <p className="text-sm">
                    Game night: <b>{chat.scores.a}</b> – <b>{chat.scores.b}</b>
                  </p>
                )}
                <p className="font-display text-lg italic text-gold">Ru knows.</p>
              </div>
            </div>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => {
              navigator.clipboard.writeText(text);
              toast.success("Recap copied — share away.");
            }}
          >
            Copy to share
          </Button>
        </div>
      )}
    </>
  );
}

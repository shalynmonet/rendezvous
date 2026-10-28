import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircleHeart, MapPinned, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RUE_IMG } from "@/components/rue";
import { startDemo } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rendezvous — Rue plans dates from your real tastes" },
      { name: "description", content: "Rue, a houndstooth-scarfed fox, uses Qloo's taste graph to plan dates, reveal shared tastes, and host playful chats for two." },
      { property: "og:title", content: "Rendezvous — Rue knows." },
      { property: "og:description", content: "Taste-matched dates, reveals and games for two, powered by Qloo." },
    ],
  }),
  component: Home,
});

const DOORS = [
  { to: "/chat", icon: MessageCircleHeart, title: "Chat with Rue", tier: "Free", body: "Rue hosts the two of you with games built from both your tastes." },
  { to: "/plan", icon: MapPinned, title: "Plan a Date", tier: "Everyday", body: "Dinner, an activity, a nightcap and a soundtrack — each with a reason." },
  { to: "/concierge", icon: Crown, title: "Concierge", tier: "Premium", body: "Tell Rue about someone you love. She drafts; Shalyn perfects and books." },
] as const;

function Home() {
  const nav = useNavigate();
  return (
    <>
      <section className="relative min-h-[78vh] overflow-hidden">
        <img src={RUE_IMG} alt="Rue the fox in a houndstooth scarf at a candlelit table" className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
        <div className="hero-fade absolute inset-0" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-5 py-16">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Bonsoir. I'm Rue.</p>
          <h1 className="mt-4 max-w-xl text-6xl font-semibold leading-[0.95] md:text-8xl">Leave the details to Rue.</h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">I read the taste graph — what you love, what they love, and the secret bridge between — then plan the evening.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="shadow-candle" onClick={() => { startDemo(); nav({ to: "/reveal" }); }}>Try a demo</Button>
            <Button size="lg" variant="outline" asChild><Link to="/profile">Build my taste profile</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-14 md:grid-cols-3">
        {DOORS.map((d) => (
          <Link key={d.to} to={d.to} className="card-luxe group p-6 transition hover:-translate-y-1 hover:shadow-candle">
            <d.icon className="h-7 w-7 text-primary" />
            <p className="mt-4 text-xs uppercase tracking-widest text-gold">{d.tier}</p>
            <h2 className="mt-1 text-3xl font-semibold">{d.title}</h2>
            <p className="mt-2 text-muted-foreground">{d.body}</p>
          </Link>
        ))}
      </section>
      <section className="mx-auto max-w-3xl px-5 pb-16 text-center">
        <h2 className="text-4xl font-semibold italic">Why Rue isn't guessing</h2>
        <p className="mt-3 text-muted-foreground">Every pick comes from Qloo's cross-domain taste graph: your favorite artists predict restaurants, films predict nightcaps, and Rue shows you the signal behind each one.</p>
      </section>
    </>
  );
}

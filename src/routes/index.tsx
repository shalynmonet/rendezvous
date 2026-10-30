import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircleHeart, MapPinned, Crown, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import homeArtwork from "@/assets/rendezvous-main-2.jpg.asset.json";
import { startDemo } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      ...(homeArtwork.url.startsWith("https://")
        ? [
            { property: "og:image", content: homeArtwork.url },
            { name: "twitter:image", content: homeArtwork.url },
          ]
        : []),
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Rendezvous - Let Ru host." },
      {
        name: "description",
        content:
          "Rendezvous presents Ru, an AI date host with taste who runs games and keeps two people talking about what they actually love.",
      },
      { property: "og:title", content: "Rendezvous - Let Ru host." },
      {
        property: "og:description",
        content:
          "Rendezvous presents Ru, an AI date host with taste who runs games and keeps two people talking about what they actually love.",
      },
    ],
  }),
  component: Home,
});

const DOORS = [
  {
    to: "/chat",
    icon: MessageCircleHeart,
    title: "Chat with Ru",
    tier: "Free",
    body: "Ru hosts the two of you with games built from both your tastes.",
  },
  {
    to: "/plan",
    icon: MapPinned,
    title: "Plan a Date",
    tier: "Everyday",
    body: "Dinner, an activity, a nightcap and a soundtrack — each with a reason.",
  },
  {
    to: "/concierge",
    icon: Crown,
    title: "Concierge",
    tier: "Premium",
    body: "Tell Ru about someone you love. She drafts; Shalyn perfects and books.",
  },
] as const;

function Home() {
  const nav = useNavigate();
  return (
    <>
      <section className="relative overflow-hidden">
        <img
          src={homeArtwork.url}
          alt="Ru the fox at a candlelit jazz lounge table, heart glasses and houndstooth scarf, with a band on stage and a moonlit Paris window"
          className="absolute inset-0 hidden h-full w-full object-cover object-[78%_55%] md:block"
        />
        <img
          src={homeArtwork.url}
          alt="Ru the fox at a candlelit jazz lounge table, heart glasses and houndstooth scarf, with a band on stage and a moonlit Paris window"
          className="block h-[42vh] w-full object-cover object-[80%_45%] md:hidden"
        />
        <div className="hero-fade absolute inset-0 hidden md:block" />
        <div className="relative mx-auto flex max-w-6xl flex-col justify-center px-5 py-12 md:min-h-[78vh] md:py-16">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Bonsoir. I'm Ru.</p>
          <h1 className="mt-4 max-w-xl text-6xl font-semibold leading-[0.95] md:text-8xl">
            Leave the details to Ru.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            I read the taste graph — what you love, what they love, and the secret bridge between —
            then plan the evening.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="shadow-candle"
              onClick={() => {
                startDemo();
                nav({ to: "/reveal" });
              }}
            >
              Try a demo
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/profile">Build my taste profile</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link to="/auth" className="text-gold">
                Already have a profile? Sign in
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pt-14">
        <Link to="/ru-lette" className="card-luxe group flex items-center gap-6 p-6 transition hover:-translate-y-1 hover:shadow-candle">
          <div className="ruelette-wheel flex h-20 w-20 shrink-0 animate-[spin_8s_linear_infinite] items-center justify-center rounded-full border-2 border-gold group-hover:animate-[spin_1.5s_linear_infinite]">
            <Heart className="h-7 w-7 fill-primary text-gold" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gold">New · Play tonight</p>
            <h2 className="mt-1 text-3xl font-semibold">Ru-lette</h2>
            <p className="mt-1 text-muted-foreground">Spin Ru's wheel for a game, song, date menu, photo booth or portrait challenge.</p>
          </div>
        </Link>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-14 md:grid-cols-3">
        {DOORS.map((d) => (
          <Link
            key={d.to}
            to={d.to}
            className="card-luxe group p-6 transition hover:-translate-y-1 hover:shadow-candle"
          >
            <d.icon className="h-7 w-7 text-primary" />
            <p className="mt-4 text-xs uppercase tracking-widest text-gold">{d.tier}</p>
            <h2 className="mt-1 text-3xl font-semibold">{d.title}</h2>
            <p className="mt-2 text-muted-foreground">{d.body}</p>
          </Link>
        ))}
      </section>
      <section className="mx-auto max-w-3xl px-5 pb-16 text-center">
        <h2 className="text-4xl font-semibold italic">Why Ru isn't guessing</h2>
        <p className="mt-3 text-muted-foreground">
          Every pick comes from Qloo's cross-domain taste graph: your favorite artists predict
          restaurants, films predict nightcaps, and Ru shows you the signal behind each one.
        </p>
      </section>
    </>
  );
}

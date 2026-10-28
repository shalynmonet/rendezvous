import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Plus, Loader2 } from "lucide-react";
import rueHero from "@/assets/rue-hero.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveTaste, type TasteT } from "@/lib/rue.functions";
import { CATEGORIES, useStore, startDemo } from "@/lib/store";

export const RUE_IMG = rueHero.url;

export function RueAvatar({ size = 44 }: { size?: number }) {
  return (
    <img src={RUE_IMG} alt="Rue the fox" width={size} height={size}
      className="shrink-0 rounded-full border-2 border-gold object-cover"
      style={{ width: size, height: size, objectPosition: "64% 22%", objectFit: "cover", transform: "scale(1)" }} />
  );
}

const LINES = ["Rue is consulting the taste graph…", "Sniffing out the good tables…", "Voilà, almost there…", "Cross-referencing your secret obsessions…", "Leave the details to Rue."];
export function RueThinking({ label }: { label?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % LINES.length), 2600); return () => clearInterval(t); }, []);
  return (
    <div className="card-luxe flex items-center gap-4 p-6">
      <RueAvatar size={56} />
      <div>
        <p className="font-display text-2xl italic">{label ?? LINES[i]}</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Calling Qloo tools — this takes about 30 seconds.</p>
      </div>
    </div>
  );
}

export function RueSays({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <RueAvatar />
      <p className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 font-display text-xl italic text-secondary-foreground">{children}</p>
    </div>
  );
}

export function PageTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <header className="mb-8">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h1 className="mt-2 text-5xl font-semibold md:text-6xl">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-muted-foreground">{sub}</p>}
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl px-5 py-10">{children}</main>;
}

/** Ensures a profile and a partner exist; otherwise offers demo or setup. */
export function NeedPair({ children }: { children: (ctx: ReturnType<typeof useStore> & { active: NonNullable<ReturnType<typeof useStore>["active"]>; me: NonNullable<ReturnType<typeof useStore>["s"]["me"]> }) => ReactNode }) {
  const st = useStore();
  if (!st.ready) return null;
  if (!st.s.me || !st.active) {
    return (
      <div className="card-luxe space-y-4 p-8">
        <RueSays>{!st.s.me ? "First, your tastes. I never plan blind." : "Every rendezvous needs two. Invite someone, or borrow my demo couple."}</RueSays>
        <div className="flex flex-wrap gap-3">
          <Button onClick={startDemo}>Try the demo</Button>
          <Button variant="outline" asChild><Link to={!st.s.me ? "/profile" : "/connections"}>{!st.s.me ? "Build my taste profile" : "Invite someone"}</Link></Button>
        </div>
      </div>
    );
  }
  return <>{children({ ...st, active: st.active, me: st.s.me })}</>;
}

export function ErrorNote({ msg }: { msg: string }) {
  return <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{msg}</p>;
}

/** Taste chips with Qloo autocomplete. */
export function TasteEditor({ value, onChange }: { value: TasteT[]; onChange: (v: TasteT[]) => void }) {
  const search = useServerFn(resolveTaste);
  const [cat, setCat] = useState<TasteT["category"]>("artist");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; image: string | null }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      try { const r = await search({ data: { label: q.trim(), category: cat } }); setHits(r.results); } finally { setBusy(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q, cat, search]);

  const add = (t: TasteT) => { if (!value.some((v) => v.label.toLowerCase() === t.label.toLowerCase())) onChange([...value, t]); setQ(""); setHits([]); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)}
            className={`rounded-full border px-3 py-1 text-sm transition ${cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{c.label}</button>
        ))}
      </div>
      <div className="relative">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Add a favorite ${CATEGORIES.find((c) => c.id === cat)?.label.toLowerCase().replace(/s$/, "")}…`}
          onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) { e.preventDefault(); add(hits[0] ? { category: cat, label: hits[0].name, entity_id: hits[0].id, name: hits[0].name } : { category: cat, label: q.trim() }); } }} />
        {busy && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
        {hits.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-candle">
            {hits.map((h) => (
              <button key={h.id} type="button" onClick={() => add({ category: cat, label: h.name, entity_id: h.id, name: h.name })}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent">
                {h.image ? <img src={h.image} alt="" className="h-8 w-8 rounded object-cover" /> : <span className="h-8 w-8 rounded bg-muted" />}
                {h.name}<span className="ml-auto text-xs text-gold">Qloo</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-muted px-3 py-1 text-sm">
            <span className="text-xs uppercase text-gold">{t.category}</span>{t.label}
            <button type="button" aria-label={`Remove ${t.label}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
          </span>
        ))}
        {!value.length && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Plus className="h-3 w-3" /> Add at least three favorites.</span>}
      </div>
    </div>
  );
}

export function WhyChip({ children }: { children: ReactNode }) {
  return <p className="mt-2 border-l-2 border-gold pl-3 text-sm text-muted-foreground"><span className="font-semibold text-gold">Why: </span>{children}</p>;
}

export function ToolTrail({ tools }: { tools: string[] }) {
  if (!tools.length) return null;
  const counts = tools.reduce<Record<string, number>>((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {});
  return (
    <p className="text-xs text-muted-foreground">Rue called Qloo: {Object.entries(counts).map(([t, n]) => `${t}${n > 1 ? ` ×${n}` : ""}`).join(" · ")}</p>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Page, PageTitle, RueSays, WhyChip } from "@/components/rue";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Concierge Desk — Rendezvous" },
      { name: "description", content: "Shalyn's review desk for concierge requests." },
      { property: "og:title", content: "Concierge Desk — Rendezvous" },
      { property: "og:description", content: "Review and refine Rue's drafts." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Req = Tables<"concierge_requests">;
type Stop = { type: string; name: string; reason: string };
const STATUSES = ["new", "in_review", "sent", "booked"];

function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Req[]>([]);
  const [sel, setSel] = useState<Req | null>(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => setIsAdmin(!!data?.some((r) => r.role === "admin")));
  }, [session]);
  const load = () =>
    supabase
      .from("concierge_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRows(data ?? []);
      });
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const auth = async (mode: "in" | "up") => {
    const r =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password: pw })
        : await supabase.auth.signUp({
            email,
            password: pw,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    if (r.error) toast.error(r.error.message);
    else if (mode === "up" && !r.data.session) toast.success("Check your email to confirm.");
  };
  const save = async () => {
    if (!sel) return;
    const { error } = await supabase
      .from("concierge_requests")
      .update({ status: sel.status, shalyn_notes: sel.shalyn_notes, draft_plan: sel.draft_plan })
      .eq("id", sel.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved.");
      load();
    }
  };

  if (!session)
    return (
      <Page>
        <PageTitle eyebrow="Staff only" title="Concierge Desk" />
        <div className="card-luxe max-w-md space-y-3 p-6">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={() => auth("in")}>Sign in</Button>
            <Button variant="outline" onClick={() => auth("up")}>
              Create account
            </Button>
          </div>
        </div>
      </Page>
    );
  if (isAdmin === false)
    return (
      <Page>
        <RueSays>This desk is for Shalyn. Ask the owner to grant you concierge access.</RueSays>
        <Button variant="ghost" className="mt-4" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </Page>
    );

  const stops = (sel?.draft_plan as { stops?: Stop[] } | null)?.stops ?? [];
  const portrait = sel?.taste_portrait as {
    headline?: string;
    summary?: string;
    signals?: { label: string; reason: string }[];
  } | null;
  return (
    <Page>
      <PageTitle eyebrow="Concierge desk" title="Requests" />
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={() => setSel(r)}
              className={`card-luxe block w-full p-3 text-left ${sel?.id === r.id ? "border-primary" : ""}`}
            >
              <p className="font-display text-xl">{r.loved_one_name}</p>
              <p className="text-xs text-muted-foreground">
                {r.occasion} · {r.city_or_destination}
              </p>
              <p className="text-xs text-gold">{r.status}</p>
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            Sign out
          </Button>
        </div>
        {sel ? (
          <div className="card-luxe space-y-5 p-6">
            <div>
              <p className="text-xs uppercase text-gold">
                From {sel.planner_name} · {sel.planner_email}
              </p>
              <h2 className="text-3xl font-semibold">{portrait?.headline}</h2>
              <p className="text-muted-foreground">{portrait?.summary}</p>
            </div>
            {portrait?.signals?.map((s, i) => (
              <div key={i}>
                <p className="font-semibold">{s.label}</p>
                <WhyChip>{s.reason}</WhyChip>
              </div>
            ))}
            <p className="text-sm">
              <b>Notes:</b> {sel.notes} · <b>Dates:</b> {sel.dates} · <b>Budget:</b> {sel.budget}
            </p>
            <h3 className="text-2xl font-semibold">Draft plan</h3>
            {stops.map((s, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[110px_1fr]">
                <Input
                  value={s.type}
                  onChange={(e) =>
                    setSel({
                      ...sel,
                      draft_plan: {
                        stops: stops.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)),
                      },
                    })
                  }
                />
                <Input
                  value={s.name}
                  onChange={(e) =>
                    setSel({
                      ...sel,
                      draft_plan: {
                        stops: stops.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      },
                    })
                  }
                />
                <Textarea
                  className="md:col-span-2"
                  value={s.reason}
                  onChange={(e) =>
                    setSel({
                      ...sel,
                      draft_plan: {
                        stops: stops.map((x, j) =>
                          j === i ? { ...x, reason: e.target.value } : x,
                        ),
                      },
                    })
                  }
                />
              </div>
            ))}
            <Textarea
              placeholder="Shalyn's notes"
              value={sel.shalyn_notes}
              onChange={(e) => setSel({ ...sel, shalyn_notes: e.target.value })}
            />
            <div className="flex items-center gap-3">
              <select
                value={sel.status}
                onChange={(e) => setSel({ ...sel, status: e.target.value })}
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} className="bg-popover">
                    {s}
                  </option>
                ))}
              </select>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        ) : (
          <RueSays>Pick a request. I've already done the sniffing.</RueSays>
        )}
      </div>
    </Page>
  );
}

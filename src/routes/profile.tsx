import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Page, PageTitle, RueSays, TasteEditor } from "@/components/rue";
import { useStore } from "@/lib/store";
import type { TasteT } from "@/lib/rue.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIFESTYLE_TOPICS, type LifestyleT } from "@/lib/lifestyle";
import { useServerFn } from "@tanstack/react-start";
import { useAccount } from "@/components/account-provider";
import { saveAccountProfile, readSavedProfile } from "@/lib/profile.functions";
import { ProfileShare } from "@/components/profile-share";
import { chatAccess } from "@/lib/guest-chat.functions";
import { newGuestKey, needsProfileChoice } from "@/lib/chat-schemas";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Your Taste Profile — Rendezvous" },
      { name: "description", content: "Tell Ru what you love; Qloo maps it." },
      { property: "og:title", content: "Your Taste Profile — Rendezvous" },
      { property: "og:description", content: "Build the taste profile Ru uses everywhere." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { s, ready, update } = useStore();
  const { user } = useAccount();
  const accountSave = useServerFn(saveAccountProfile);
  const accountRead = useServerFn(readSavedProfile);
  const access = useServerFn(chatAccess);
  const [sharing, setSharing] = useState(false);
  const nav = useNavigate();
  const [saved, setSaved] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [tastes, setTastes] = useState<TasteT[]>([]);
  const [lifestyle, setLifestyle] = useState<NonNullable<LifestyleT>>({});
  useEffect(() => {
    if (ready && s.me) {
      setName(s.me.name);
      setCity(s.me.city);
      setTastes(s.me.tastes);
      setLifestyle(s.me.lifestyle ?? {});
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!name.trim() || tastes.length < 3) {
      toast.error("A name and at least three favorites, s'il vous plaît.");
      return;
    }
    update((st) => ({ ...st, me: { name: name.trim(), city: city.trim() || "Chicago", tastes, lifestyle } }));
    toast.success("Saved. Ru knows.");
    setSaved(true);
    if (user) {
      try {
        const local = { name: name.trim(), city: city.trim() || "Chicago", tastes, lifestyle };
        const existing = await accountRead();
        if (needsProfileChoice(local, existing)) {
          toast.info(
            "Your account has different tastes. Choose which to keep on your account page.",
          );
          nav({ to: "/auth" });
          return;
        }
        await accountSave({ data: local });
        toast.success("Saved to your account.");
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    if (s.pendingInvite) nav({ to: "/invite", search: { i: s.pendingInvite } });
  };

  return (
    <Page>
      <PageTitle
        eyebrow="Step one"
        title="Your Taste Profile"
        sub="Sixty seconds. Pick from Qloo's suggestions so Ru can read the taste graph precisely."
      />
      <div className="card-luxe space-y-6 p-6">
        <RueSays>Tell me three things you'd defend at a dinner party.</RueSays>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Your first name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input placeholder="Your city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <Tabs defaultValue="tastes">
          <TabsList>
            <TabsTrigger value="tastes">Tastes</TabsTrigger>
            <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
          </TabsList>
          <TabsContent value="tastes" className="pt-4">
            <TasteEditor value={tastes} onChange={setTastes} />
          </TabsContent>
          <TabsContent value="lifestyle" className="space-y-5 pt-4">
            <p className="text-sm text-muted-foreground">
              Optional. Ru uses this to suggest dates you'll both be comfortable with — never to judge.
            </p>
            {LIFESTYLE_TOPICS.map((t) => (
              <fieldset key={t.key} className="space-y-2">
                <legend className="font-medium">{t.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {t.options.map((o) => (
                    <Button
                      key={o}
                      type="button"
                      size="sm"
                      variant={lifestyle[t.key] === o ? "default" : "outline"}
                      aria-pressed={lifestyle[t.key] === o}
                      onClick={() =>
                        setLifestyle((l) => ({ ...l, [t.key]: l[t.key] === o ? undefined : o }))
                      }
                    >
                      {o}
                    </Button>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset className="space-y-2">
              <legend className="font-medium">Okay if my date partakes?</legend>
              <div className="flex flex-wrap gap-2">
                {([["Yes", true], ["Prefer they don't", false]] as const).map(([lbl, v]) => (
                  <Button
                    key={lbl}
                    type="button"
                    size="sm"
                    variant={lifestyle.openToPartner === v ? "default" : "outline"}
                    aria-pressed={lifestyle.openToPartner === v}
                    onClick={() =>
                      setLifestyle((l) => ({ ...l, openToPartner: l.openToPartner === v ? undefined : v }))
                    }
                  >
                    {lbl}
                  </Button>
                ))}
              </div>
            </fieldset>
          </TabsContent>
        </Tabs>
        <Button onClick={save}>Save my tastes</Button>
      </div>
      {saved && (
        <section className="mt-8 space-y-4 border-t pt-6">
          <p role="status">
            Your taste profile is saved {user ? "to your account" : "in this browser"}.
          </p>
          {!user && (
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/auth">Create account to keep my tastes</Link>
              </Button>
              <Button variant="ghost" onClick={() => setSaved(false)}>
                Not now
              </Button>
            </div>
          )}
          <Button variant="outline" asChild>
            <Link to="/connections">Invite someone to chat</Link>
          </Button>
        </section>
      )}
      {s.me && origin && (
        <section className="mt-8 space-y-4 border-t pt-6">
          <h2 className="text-3xl">Share your taste profile</h2>
          {s.pendingRoom?.invite ? (
            <ProfileShare name={s.me.name} link={`${origin}/invite?i=${s.pendingRoom.invite}`} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Share your first name, city, and favorites with the person you invite.
              </p>
              <Button
                disabled={sharing}
                onClick={async () => {
                  if (!s.me) return;
                  setSharing(true);
                  try {
                    const token = newGuestKey(),
                      invite = newGuestKey();
                    const r = await access({
                      data: { action: "create", token, invite, profile: s.me },
                    });
                    if (r.id) {
                      const id = r.id;
                      update((st) => ({ ...st, pendingRoom: { id, token, invite } }));
                    }
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setSharing(false);
                  }
                }}
              >
                {sharing ? "Creating…" : "Create share link and QR"}
              </Button>
            </>
          )}
        </section>
      )}
    </Page>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Page, PageTitle, RueSays, TasteEditor } from "@/components/rue";
import { useStore } from "@/lib/store";
import type { TasteT } from "@/lib/rue.functions";
import { useServerFn } from '@tanstack/react-start';
import { useAccount } from '@/components/account-provider';
import { saveAccountProfile } from '@/lib/profile.functions';
import { ProfileShare } from '@/components/profile-share';
import { encodeInvite } from '@/lib/store';

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your Taste Profile — Rendezvous" }, { name: "description", content: "Tell Rue what you love; Qloo maps it." }, { property: "og:title", content: "Your Taste Profile — Rendezvous" }, { property: "og:description", content: "Build the taste profile Rue uses everywhere." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { s, ready, update } = useStore();
  const {user}=useAccount();
  const accountSave=useServerFn(saveAccountProfile);
  const nav=useNavigate();
  const [saved,setSaved]=useState(false);
  const [origin,setOrigin]=useState('');
  useEffect(()=>setOrigin(window.location.origin),[]);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [tastes, setTastes] = useState<TasteT[]>([]);
  useEffect(() => { if (ready && s.me) { setName(s.me.name); setCity(s.me.city); setTastes(s.me.tastes); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!name.trim() || tastes.length < 3) { toast.error("A name and at least three favorites, s'il vous plaît."); return; }
    update((st) => ({ ...st, me: { name: name.trim(), city: city.trim() || "Chicago", tastes } }));
    toast.success("Saved. Rue knows.");
    setSaved(true);
    if(user){try{await accountSave({data:{name:name.trim(),city:city.trim()||'Chicago',tastes}});toast.success('Saved to your account.');}catch(e){toast.error((e as Error).message);}}
    if(s.pendingInvite)nav({to:'/invite',search:{i:s.pendingInvite}});
  };

  return (
    <Page>
      <PageTitle eyebrow="Step one" title="Your Taste Profile" sub="Sixty seconds. Pick from Qloo's suggestions so Rue can read the taste graph precisely." />
      <div className="card-luxe space-y-6 p-6">
        <RueSays>Tell me three things you'd defend at a dinner party.</RueSays>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Your city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <TasteEditor value={tastes} onChange={setTastes} />
        <Button onClick={save}>Save my tastes</Button>
      </div>
      {saved&&<section className="mt-8 space-y-4 border-t pt-6"><p role="status">Your taste profile is saved {user?'to your account':'in this browser'}.</p>{!user&&<div className="flex flex-wrap gap-3"><Button asChild><Link to="/auth">Create account to keep my tastes</Link></Button><Button variant="ghost" onClick={()=>setSaved(false)}>Not now</Button></div>}<Button variant="outline" asChild><Link to="/connections">Invite someone to chat</Link></Button></section>}
      {s.me&&origin&&<section className="mt-8 space-y-4 border-t pt-6"><h2 className="text-3xl">Share your taste profile</h2><ProfileShare name={s.me.name} link={`${origin}/invite?d=${encodeInvite(s.me)}`}/></section>}
    </Page>
  );
}

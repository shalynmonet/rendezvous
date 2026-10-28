import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Page, PageTitle, RueSays } from "@/components/rue";
import { decodeInvite, useStore, type Profile } from "@/lib/store";
import { useServerFn } from '@tanstack/react-start';
import { chatAccess } from '@/lib/guest-chat.functions';
import { newGuestKey } from '@/lib/chat-schemas';
import { ErrorNote } from '@/components/rue';

export const Route = createFileRoute("/invite")({
  validateSearch: z.object({ d: z.string().optional(), i: z.string().optional() }),
  head: () => ({ meta: [{ title: "You're invited — Rendezvous" }, { name: "description", content: "Someone wants Rue to compare your tastes." }, { property: "og:title", content: "You're invited to a Rendezvous" }, { property: "og:description", content: "Accept and let Rue reveal what you share." }] }),
  component: Invite,
});

function Invite() {
  const { d, i } = Route.useSearch();
  const access=useServerFn(chatAccess);
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);
  const { s, ready, update } = useStore();
  const nav = useNavigate();
  const [p, setP] = useState<Profile | null>(null);
  useEffect(() => {
    let alive=true;
    if(i){void access({data:{action:'preview',token:newGuestKey(),invite:i}}).then(r=>{if(alive)setP(r.profile);}).catch(e=>{if(alive)setErr((e as Error).message);});}
    else setP(d ? decodeInvite(d) : null);
    return()=>{alive=false;};
  }, [d,i,access]);
  if (!ready) return null;
  if (!p) return <Page>{err?<ErrorNote msg={err}/>:<RueSays>{i?'Opening your invitation…':'This invitation seems to have lost its envelope.'}</RueSays>}</Page>;

  const accept = async () => {
    if(i){
      if(!s.me){update(st=>({...st,pendingInvite:i}));nav({to:'/profile'});return;}
      setBusy(true);setErr('');
      try{const token=newGuestKey();const r=await access({data:{action:'join',token,invite:i,profile:s.me}});if(!r.id)return;const id=r.id;update(st=>({...st,pendingInvite:undefined,connections:[...st.connections.filter(c=>c.id!==id),{id,label:'live',profile:p,room:{id,token}}],activeId:id}));nav({to:'/chat'});}catch(e){setErr((e as Error).message);}finally{setBusy(false);}return;
    }
    const id = `inv-${p.name}-${Date.now()}`;
    update((st) => ({ ...st, connections: [...st.connections, { id, label: "date", profile: p }], activeId: id }));
    nav({ to: s.me ? "/reveal" : "/profile" });
  };
  return (
    <Page>
      <PageTitle eyebrow="An invitation" title={`${p.name} wants a Rendezvous`} />
      <div className="card-luxe space-y-4 p-6">
        <RueSays>Bonsoir. {p.name} has excellent taste. Let's see if you do too.</RueSays>
        <Button disabled={busy} onClick={accept}>{busy?'Joining…':!s.me&&i?'Create my tastes and join':'Accept invitation'}</Button>
        {err&&<ErrorNote msg={err}/>}
        {!s.me && <p className="text-sm text-muted-foreground">You'll build your taste profile next. <Link to="/profile" className="underline">Start now</Link></p>}
      </div>
    </Page>
  );
}

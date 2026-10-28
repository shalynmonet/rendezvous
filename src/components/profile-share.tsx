import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Download, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function ProfileShare({link,name}:{link:string;name:string}) {
  const [native,setNative]=useState(false);
  useEffect(()=>setNative(typeof navigator.share==='function'),[]);
  const text=`${name} invites you to a Rendezvous. ${link}`;
  const download=()=>{const svg=document.querySelector('[data-profile-qr] svg');if(!svg)return;const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='rendezvous-invite.svg';a.click();URL.revokeObjectURL(url);};
  return <section className="space-y-4" aria-label="Share taste profile">
    <p className="text-sm text-muted-foreground">Anyone with this link can see your first name, city, and favorites. Your email stays private.</p>
    <div className="profile-qr" data-profile-qr><QRCodeSVG value={link} size={192} level="M" title={`${name}'s Rendezvous invitation`} /></div>
    <input aria-label="Share link" readOnly value={link} className="w-full min-w-0 rounded-md border bg-muted p-2 text-xs" />
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(link);toast.success('Link copied.');}catch{toast.error('Select and copy the link above.');}}}><Copy/>Copy link</Button>
      {native&&<Button variant="outline" onClick={async()=>{try{await navigator.share({title:'Rendezvous',text,url:link});}catch(e){if((e as Error).name!=='AbortError')toast.error('Sharing could not open. Copy the link instead.');}}}><Share2/>Share</Button>}
      <Button variant="outline" asChild><a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle/>WhatsApp</a></Button>
      <Button variant="outline" asChild><a href={`mailto:?subject=Your%20Rendezvous%20invitation&body=${encodeURIComponent(text)}`}><Mail/>Email</a></Button>
      <Button variant="ghost" title="Download QR code" aria-label="Download QR code" size="icon" onClick={download}><Download/></Button>
    </div>
  </section>;
}
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ProfileShare } from "@/components/profile-share";
import { RueAvatar } from "@/components/rue";
import { useInvite } from "@/hooks/use-invite";
import type { Profile } from "@/lib/store";

/**
 * A real person answers for themselves. Until they join the live room, Ru waits
 * rather than writing replies in their voice.
 */
export function WaitingForPartner({ partner, me, compact }: { partner: Profile; me: Profile; compact?: boolean }) {
  const { busy, link, create } = useInvite();
  if (compact)
    return (
      <section className="card-luxe mb-4 space-y-3 p-4" aria-live="polite">
        <p className="text-sm text-muted-foreground">{partner.name} isn&rsquo;t in the live room yet. This page switches to your live chat on its own once they join from your newest invitation.</p>
        {link ? <ProfileShare link={link} name={me.name} /> : (
          <Button size="sm" disabled={busy} onClick={() => void create()}>{busy ? "Creating invitation…" : `Invite ${partner.name} to join`}</Button>
        )}
      </section>
    );
  return (
    <section className="card-luxe space-y-5 p-6" role="status" aria-live="polite">
      <div className="flex items-start gap-4">
        <RueAvatar size={56} />
        <div className="space-y-2">
          <p className="font-display text-3xl italic">Waiting for {partner.name}…</p>
          <p className="max-w-xl text-muted-foreground">
            I don&rsquo;t put words in {partner.name}&rsquo;s mouth — real people answer for
            themselves. Send them this invitation and the moment they&rsquo;re in, we&rsquo;re
            talking.
          </p>
        </div>
      </div>
      {link ? (
        <ProfileShare link={link} name={me.name} />
      ) : (
        <Button disabled={busy} onClick={() => void create()}>
          {busy ? "Creating invitation…" : `Invite ${partner.name} to join`}
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        Meanwhile:{" "}
        <Link to="/reveal" className="text-gold underline">
          Taste Reveal
        </Link>
        {" · "}
        <Link to="/connections" className="text-gold underline">
          Your people
        </Link>
      </p>
    </section>
  );
}

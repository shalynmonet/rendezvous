import { useState } from "react";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { nameKey, personKey, personQualifier, setDifferentPeople } from "@/lib/person-identity";
import { useStore, type Connection } from "@/lib/store";

export function PersonSeparation({ person, candidates }: { person: Connection; candidates: Connection[] }) {
  const { s, update } = useStore();
  const [open, setOpen] = useState(false);
  const others = candidates.filter((c, index) =>
    personKey(c) !== personKey(person) && nameKey(c.profile.name) === nameKey(person.profile.name) &&
    !!c.demo === !!person.demo && candidates.findIndex((other) => personKey(other) === personKey(c)) === index,
  );
  if (!others.length) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" aria-label={`Different people: ${person.profile.name}, ${personQualifier(person.profile, person)}`} onClick={() => setOpen(true)}>
        <UsersRound className="mr-2 h-4 w-4" />Different people
      </Button>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogTitle>Keep {person.profile.name} separate</DialogTitle>
        <DialogDescription>{personQualifier(person.profile, person)}</DialogDescription>
        <div className="space-y-4">
          {others.map((other) => {
            const current = s.connections.find((c) => personKey(c) === personKey(person)) ?? person;
            const counterpart = s.connections.find((c) => personKey(c) === personKey(other)) ?? other;
            const key = personKey(other);
            const ownKey = personKey(person);
            const checked = !!((key && current.differentFrom?.includes(key)) || (ownKey && counterpart.differentFrom?.includes(ownKey)));
            const id = `separate-${person.id}-${other.id}`;
            return <label key={other.id} htmlFor={id} className="flex items-start gap-3 border-b border-border pb-4">
              <Checkbox id={id} checked={checked} onCheckedChange={(value) => update((st) => {
                const missing = [person, other].filter((p) => !st.connections.some((c) => personKey(c) === personKey(p)));
                return setDifferentPeople({ ...st, connections: [...st.connections, ...missing] }, person, other, value === true);
              })} />
              <span className="min-w-0 break-words">
                <span className="block font-semibold">Different from {other.profile.name} · {personQualifier(other.profile, other)}</span>
                <span className="text-sm text-muted-foreground">{other.profile.tastes.slice(0, 3).map((taste) => taste.label).join(" · ")}</span>
              </span>
            </label>;
          })}
        </div>
        <Button onClick={() => setOpen(false)}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAccount } from "@/components/account-provider";
import { listAccountChats } from "@/lib/saved-chat.functions";
import { readSavedProfile } from "@/lib/profile.functions";
import { savedPeople } from "@/lib/saved-people";
import { setState, useStore } from "@/lib/store";
import { sameConnectionPerson } from "@/lib/person-identity";

/** Adds account-saved partners (e.g. from past live chats) as selectable connections on any device. */
export function useAccountPeople() {
  const { user } = useAccount();
  const { s, ready } = useStore();
  const readChats = useServerFn(listAccountChats);
  const readProfile = useServerFn(readSavedProfile);
  const chats = useQuery({ queryKey: ["account-chats", user?.id], queryFn: () => readChats(), enabled: !!user });
  const profile = useQuery({ queryKey: ["account-profile", user?.id], queryFn: () => readProfile(), enabled: !!user });
  const people = user && chats.data ? savedPeople(chats.data, profile.data ?? s.me, s.connections) : [];
  const key = people.map((p) => p.id).join("|");
  useEffect(() => {
    if (!ready || !people.length) return;
    setState((st) => {
      // A saved person only joins an existing card when the profiles really match,
      // so a second person with the same name still gets their own card.
      const missing = people.filter(
        (p) =>
          !st.connections.some(
            (c) =>
              c.id === p.id ||
              `live:${c.room?.id}` === p.id ||
              (!c.demo && sameConnectionPerson(c, p)),
          ),
      );
      if (!missing.length) return st;
      return { ...st, connections: [...st.connections, ...missing.map((p) => ({ id: p.id, label: "saved", profile: p.profile, addedAt: p.addedAt }))], activeId: st.activeId ?? missing[0]?.id ?? null };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);
  return { loading: !!user && chats.isPending };
}

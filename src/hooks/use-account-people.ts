import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAccount } from "@/components/account-provider";
import { listAccountChats } from "@/lib/saved-chat.functions";
import { readSavedProfile } from "@/lib/profile.functions";
import { savedPeople } from "@/lib/saved-people";
import { setState, useStore } from "@/lib/store";

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
      const norm = (n: string) => n.trim().toLowerCase();
      const seen = new Set(st.connections.filter((c) => !c.demo).map((c) => norm(c.profile.name)));
      const missing = people.filter((p) => {
        if (st.connections.some((c) => c.id === p.id || `live:${c.room?.id}` === p.id) || seen.has(norm(p.profile.name))) return false;
        seen.add(norm(p.profile.name));
        return true;
      });
      if (!missing.length) return st;
      return { ...st, connections: [...st.connections, ...missing.map((p) => ({ id: p.id, label: "saved", profile: p.profile }))], activeId: st.activeId ?? missing[0]!.id };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);
  return { loading: !!user && chats.isPending };
}

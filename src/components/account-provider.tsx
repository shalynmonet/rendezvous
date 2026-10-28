import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

const AccountContext = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const query = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) {
        setUser(data.user);
        setReady(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setReady(true);
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) {
        void router.invalidate();
        if (event !== "SIGNED_OUT") void query.invalidateQueries();
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [query, router]);
  return <AccountContext.Provider value={{ user, ready }}>{children}</AccountContext.Provider>;
}
export const useAccount = () => useContext(AccountContext);

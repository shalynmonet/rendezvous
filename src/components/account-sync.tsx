import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "./account-provider";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { readAccountWorkspace, saveAccountWorkspace } from "@/lib/account-workspace.functions";
import { storeSnapshot, subscribeStore, switchAccountStore, type State } from "@/lib/store";

export function AccountSync({ children }: { children: ReactNode }) {
  const { user, ready } = useAccount();
  const read = useServerFn(readAccountWorkspace);
  const save = useServerFn(saveAccountWorkspace);
  const query = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [choice, setChoice] = useState<{ local: State; saved: State; revision: number } | null>(null);
  const revision = useRef(0);
  const owner = useRef<string | null>(null);
  const flush = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!ready) return;
    let stopped = false; let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let writing = false; let dirty = false;
    setLoading(true); setError(""); setChoice(null);
    const persist = async () => {
      if (writing || stopped || !user) return;
      writing = true; dirty = false;
      try {
        const result = await save({ data: { state: storeSnapshot(), revision: revision.current } });
        if (stopped) return;
        if (result.conflict) {
          const latest = await read();
          setChoice({ local: storeSnapshot(), saved: JSON.parse(latest.stateJson) as State, revision: latest.revision });
          setError("Your account changed in another browser. Choose which version to keep.");
          return;
        }
        revision.current = result.revision;
        setError("");
        void query.invalidateQueries({ queryKey: ["account-chats", user.id] });
      } catch (e) { if (!stopped) { dirty = true; setError((e as Error).message); } }
      finally { writing = false; if (dirty && !stopped) timer = setTimeout(() => void persist(), 2500); }
    };
    const start = (state: State, rev: number) => {
      revision.current = rev;
      owner.current = user?.id ?? null;
      switchAccountStore(user?.id ?? null, state);
      unsubscribe = subscribeStore(() => { dirty = true; clearTimeout(timer); timer = setTimeout(() => void persist(), 500); });
      flush.current = () => { dirty = true; void persist(); };
      setLoading(false);
      dirty = true; void persist();
    };
    void (async () => {
      if (!user) { switchAccountStore(null); owner.current = null; setLoading(false); return; }
      const local = owner.current === null ? (() => { switchAccountStore(null); return storeSnapshot(); })() : { me: null, connections: [], activeId: null };
      try {
        const saved = await read();
        if (stopped) return;
        const hasLocal = !!local.me || local.connections.length > 0 || !!local.memories?.length;
        const savedState = JSON.parse(saved.stateJson) as State;
        if (hasLocal && JSON.stringify(local) !== JSON.stringify(savedState)) {
          setChoice({ local, saved: savedState, revision: saved.revision }); setLoading(false);
          flush.current = () => start(storeSnapshot(), revision.current);
        } else start(savedState, saved.revision);
      } catch (e) { if (!stopped) { setError((e as Error).message); setLoading(false); } }
    })();
    const onHidden = () => { if (document.hidden) void persist(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => { stopped = true; clearTimeout(timer); unsubscribe?.(); flush.current = null; document.removeEventListener("visibilitychange", onHidden); };
  }, [user?.id, ready, read, save, query]);
  const choose = (state: State) => {
    if (!choice || !user) return;
    revision.current = choice.revision;
    switchAccountStore(user.id, state);
    setChoice(null); setError(""); flush.current?.();
  };
  return <>
    {error && <div role="alert" className="border-b border-destructive p-3 text-center text-sm">{error} <Button size="sm" variant="outline" onClick={() => flush.current?.()}>Retry saving</Button></div>}
    {loading ? <p role="status" className="p-8 text-center">Restoring your account…</p> : choice ? null : children}
    <Dialog open={!!choice}><DialogContent><DialogHeader><DialogTitle>Keep your account data</DialogTitle><DialogDescription>This browser has a separate guest profile or activity. Choose what to keep in your account.</DialogDescription></DialogHeader>
      <Button onClick={() => choice && choose(choice.saved)}>Use account data</Button>
      <Button variant="outline" onClick={() => choice && choose({ ...choice.saved, ...choice.local, connections: [...choice.local.connections, ...choice.saved.connections.filter((c) => !choice.local.connections.some((l) => l.id === c.id))], chats: { ...choice.saved.chats, ...choice.local.chats }, memories: [...choice.local.memories ?? [], ...(choice.saved.memories ?? []).filter((m) => !(choice.local.memories ?? []).some((l) => l.id === m.id))] })}>Import browser data into account</Button>
    </DialogContent></Dialog>
  </>;
}
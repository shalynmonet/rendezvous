import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "./account-provider";
import { saveAccountChat } from "@/lib/saved-chat.functions";
import type { AccountChat } from "@/lib/saved-chat-schemas";
import type { GuestRoom } from "@/lib/chat-schemas";

export function ChatSave({ snapshot, room, disabled = false }: { snapshot?: AccountChat | undefined; room?: GuestRoom | undefined; disabled?: boolean }) {
  const { user, ready } = useAccount();
  const save = useServerFn(saveAccountChat);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [savedVersion, setSavedVersion] = useState<string | null>(null);
  const [error, setError] = useState("");
  const version = JSON.stringify(snapshot);
  if (!ready) return null;
  if (!user) return <Button variant="outline" className="h-auto w-full whitespace-normal" asChild><Link to="/auth">Create an account to save</Link></Button>;
  return <div className="space-y-2">
    <Button variant="outline" className="h-auto w-full whitespace-normal" disabled={disabled || busy || !snapshot?.messages.length} onClick={async () => {
      if (!snapshot) return;
      setBusy(true); setError("");
      try { await save({ data: room ? { room: room.id, token: room.token } : { snapshot } }); setSavedVersion(version); await queryClient.invalidateQueries({ queryKey: ["account-chats", user.id] }); }
      catch (e) { setError((e as Error).message); }
      finally { setBusy(false); }
    }}>
      {savedVersion === version ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
      {busy ? "Saving…" : savedVersion === version ? "Saved to account" : "Save chat to account"}
    </Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button variant="ghost" className="w-full" asChild><Link to="/saved-chats">Saved chats</Link></Button>
  </div>;
}
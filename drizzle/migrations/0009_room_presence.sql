ALTER TABLE public.guest_chats ADD COLUMN IF NOT EXISTS a_seen_at timestamptz, ADD COLUMN IF NOT EXISTS b_seen_at timestamptz;
CREATE OR REPLACE FUNCTION public.guest_room_presence(p_room uuid, p_token text, p_here boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb; side text; other timestamptz;
BEGIN
 r := public.guest_chat_access_consent_base('read', p_room, p_token);
 side := r->>'side';
 IF p_here THEN
  IF side='a' THEN UPDATE public.guest_chats SET a_seen_at=now() WHERE id=p_room;
  ELSE UPDATE public.guest_chats SET b_seen_at=now() WHERE id=p_room; END IF;
 END IF;
 SELECT CASE WHEN side='a' THEN b_seen_at ELSE a_seen_at END INTO other FROM public.guest_chats WHERE id=p_room;
 RETURN jsonb_build_object('other_waiting', other IS NOT NULL AND other > now() - interval '45 seconds');
END $$;
REVOKE ALL ON FUNCTION public.guest_room_presence(uuid,text,boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_room_presence(uuid,text,boolean) TO anon, authenticated, service_role;
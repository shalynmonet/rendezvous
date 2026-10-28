ALTER TABLE public.guest_chats ADD COLUMN IF NOT EXISTS ru_muted boolean NOT NULL DEFAULT false;
ALTER FUNCTION public.guest_chat_access(text,uuid,text,text,jsonb,text,text,text) RENAME TO guest_chat_access_base;
REVOKE ALL ON FUNCTION public.guest_chat_access_base(text,uuid,text,text,jsonb,text,text,text) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.guest_chat_access(p_action text, p_room uuid DEFAULT NULL, p_token text DEFAULT '', p_invite text DEFAULT '', p_profile jsonb DEFAULT NULL, p_text text DEFAULT '', p_message_id text DEFAULT '', p_mood text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; muted boolean;
BEGIN
 IF p_action IN ('mute','unmute','claim') THEN
  result := public.guest_chat_access_base('read',p_room,p_token);
  IF p_action IN ('mute','unmute') THEN
   UPDATE public.guest_chats SET ru_muted=(p_action='mute'), claim=CASE WHEN p_action='mute' THEN NULL ELSE claim END WHERE id=p_room;
   result := public.guest_chat_access_base('read',p_room,p_token);
  ELSE
   SELECT ru_muted INTO muted FROM public.guest_chats WHERE id=p_room;
   IF muted THEN RETURN jsonb_build_object('claimed',false); END IF;
   RETURN public.guest_chat_access_base(p_action,p_room,p_token,p_invite,p_profile,p_text,p_message_id,p_mood);
  END IF;
 ELSE
  result := public.guest_chat_access_base(p_action,p_room,p_token,p_invite,p_profile,p_text,p_message_id,p_mood);
 END IF;
 IF p_action IN ('read','send','mute','unmute') THEN
  SELECT ru_muted INTO muted FROM public.guest_chats WHERE id=p_room;
  result := result || jsonb_build_object('muted',muted);
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.guest_chat_access(text,uuid,text,text,jsonb,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_chat_access(text,uuid,text,text,jsonb,text,text,text) TO anon,authenticated,service_role;
ALTER FUNCTION public.guest_ruelette(uuid,text,text,jsonb) RENAME TO guest_ruelette_base;
REVOKE ALL ON FUNCTION public.guest_ruelette_base(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.guest_ruelette(p_room uuid,p_token text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; rl jsonb; pending jsonb; side text; proposal jsonb;
BEGIN
 result := public.guest_ruelette_base(p_room,p_token,'read');
 rl := result->'ruelette'; side := result->>'side'; pending := rl->'next_spin';
 IF p_action IN ('spin','approve_spin','cancel_spin') THEN
  IF NOT coalesce((result->>'joined')::boolean,false) THEN RAISE EXCEPTION 'Waiting for the other person to join'; END IF;
  IF (rl->>'spin_id') IS DISTINCT FROM (p_payload->>'expected_spin') THEN RAISE EXCEPTION 'The activity has changed. Please try again.'; END IF;
  IF rl->>'status'='generating' AND (rl->>'at')::timestamptz > now()-interval '3 minutes' THEN RAISE EXCEPTION 'Ru is still preparing this activity'; END IF;
  IF p_action='cancel_spin' THEN
   rl := rl - 'next_spin';
  ELSIF p_action='approve_spin' THEN
   IF pending IS NULL OR pending='null'::jsonb OR pending->>'id' IS DISTINCT FROM p_payload->>'proposal_id' THEN RAISE EXCEPTION 'This spin request is no longer available'; END IF;
   IF pending->>'by'=side THEN RAISE EXCEPTION 'Waiting for the other person to approve'; END IF;
   RETURN public.guest_ruelette_base(p_room,p_token,'spin',pending);
  ELSE
   IF p_payload->>'mode' NOT IN ('game','game_prompt','song','recipe','photo_booth','portrait') OR p_payload->>'mode' IS NULL THEN RAISE EXCEPTION 'Invalid activity'; END IF;
   IF rl->>'spin_id' IS NULL THEN RETURN public.guest_ruelette_base(p_room,p_token,'spin',p_payload); END IF;
   IF pending IS NOT NULL AND pending<>'null'::jsonb THEN RAISE EXCEPTION 'A next spin is already waiting for approval'; END IF;
   proposal := jsonb_build_object('id',gen_random_uuid(),'by',side,'mode',p_payload->>'mode','rot',(p_payload->>'rot')::numeric,'at',now());
   rl := rl || jsonb_build_object('next_spin',proposal);
  END IF;
  UPDATE public.guest_chats SET ruelette=rl WHERE id=p_room;
  RETURN result || jsonb_build_object('ruelette',rl);
 END IF;
 RETURN public.guest_ruelette_base(p_room,p_token,p_action,p_payload);
END $$;
REVOKE ALL ON FUNCTION public.guest_ruelette(uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_ruelette(uuid,text,text,jsonb) TO anon,authenticated,service_role;
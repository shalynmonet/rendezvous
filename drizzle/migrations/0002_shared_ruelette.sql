ALTER TABLE public.guest_chats ADD COLUMN IF NOT EXISTS ruelette jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.guest_ruelette(p_room uuid, p_token text, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.guest_chats; side text; h text; rl jsonb; sid text;
BEGIN
 IF length(p_token) < 32 OR length(p_token) > 128 THEN RAISE EXCEPTION 'Invalid private chat key'; END IF;
 IF length(coalesce(p_payload::text,'')) > 60000 THEN RAISE EXCEPTION 'Payload too large'; END IF;
 h := encode(sha256(convert_to(p_token,'UTF8')),'hex');
 SELECT * INTO r FROM public.guest_chats WHERE id=p_room AND expires_at>now() FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Room expired or unavailable'; END IF;
 IF h=r.a_hash THEN side:='a'; ELSIF h=r.b_hash THEN side:='b'; ELSE RAISE EXCEPTION 'Private room access denied'; END IF;
 rl := r.ruelette; sid := rl->>'spin_id';
 IF p_action='read' THEN
   RETURN jsonb_build_object('side',side,'joined',r.b_hash IS NOT NULL,'ruelette',rl);
 ELSIF p_action='spin' THEN
   IF r.b_hash IS NULL THEN RAISE EXCEPTION 'Waiting for the other person to join'; END IF;
   IF rl->>'status'='generating' AND (rl->>'at')::timestamptz > now()-interval '3 minutes' THEN RAISE EXCEPTION 'Rue is still preparing the last spin'; END IF;
   rl := jsonb_build_object('spin_id',gen_random_uuid(),'mode',p_payload->>'mode','rot',(p_payload->>'rot')::numeric,'by',side,'at',now(),
     'status',CASE WHEN p_payload->>'mode'='game' THEN 'ready' ELSE 'generating' END,'activity',NULL,'error',NULL,'uploads','{}'::jsonb,'debrief',NULL);
 ELSIF p_action='activity' THEN
   IF sid IS DISTINCT FROM p_payload->>'spin_id' THEN RETURN jsonb_build_object('side',side,'ruelette',rl); END IF;
   rl := rl || jsonb_build_object('status',CASE WHEN p_payload ? 'error' THEN 'error' ELSE 'ready' END,'activity',p_payload->'activity','error',p_payload->>'error');
 ELSIF p_action='upload' THEN
   IF sid IS DISTINCT FROM p_payload->>'spin_id' OR (p_payload->>'path') NOT LIKE (p_room::text || '/' || sid || '/' || side || '%') THEN RAISE EXCEPTION 'Invalid upload'; END IF;
   rl := jsonb_set(rl,'{uploads}',coalesce(rl->'uploads','{}'::jsonb) || jsonb_build_object(side,p_payload->>'path'));
 ELSIF p_action='debrief' THEN
   IF sid IS DISTINCT FROM p_payload->>'spin_id' THEN RAISE EXCEPTION 'That activity has changed'; END IF;
   rl := rl || jsonb_build_object('debrief',(p_payload->'debrief') || jsonb_build_object('by',side,'at',now()));
 ELSE RAISE EXCEPTION 'Unknown action'; END IF;
 UPDATE public.guest_chats SET ruelette=rl WHERE id=r.id;
 RETURN jsonb_build_object('side',side,'joined',true,'ruelette',rl);
END $function$;

REVOKE ALL ON FUNCTION public.guest_ruelette(uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_ruelette(uuid,text,text,jsonb) TO anon, authenticated, service_role;
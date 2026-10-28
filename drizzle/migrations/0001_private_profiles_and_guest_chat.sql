CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, taste_profile jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile" ON public.profiles TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE FUNCTION public.create_taste_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles(id) VALUES (NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER rendezvous_profile_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_taste_profile();
CREATE TABLE public.guest_chats (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invite_hash text NOT NULL UNIQUE, a_hash text NOT NULL, b_hash text, profile_a jsonb NOT NULL, profile_b jsonb, expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days', messages jsonb NOT NULL DEFAULT '[]', game jsonb, scores jsonb NOT NULL DEFAULT '{"a":0,"b":0}', mood text, tools jsonb NOT NULL DEFAULT '[]', claim uuid, claimed_at timestamptz, rue_error text, last_rue_index integer NOT NULL DEFAULT 0);
GRANT ALL ON public.guest_chats TO service_role;
ALTER TABLE public.guest_chats ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.guest_chat_access(p_action text, p_room uuid DEFAULT NULL, p_token text DEFAULT '', p_invite text DEFAULT '', p_profile jsonb DEFAULT NULL, p_text text DEFAULT '', p_message_id text DEFAULT '', p_mood text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.guest_chats; side text; h text; n integer; claimed uuid; answer_a boolean; answer_b boolean;
BEGIN
IF length(p_token) < 32 OR length(p_token) > 128 THEN RAISE EXCEPTION 'Invalid private chat key'; END IF;
h := encode(sha256(convert_to(p_token,'UTF8')),'hex');
IF p_action = 'create' THEN
 IF length(p_invite) < 32 OR p_profile IS NULL OR length(p_profile::text) > 20000 OR coalesce(p_profile->>'name','') = '' THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
 INSERT INTO public.guest_chats(invite_hash,a_hash,profile_a) VALUES(encode(sha256(convert_to(p_invite,'UTF8')),'hex'),h,p_profile) RETURNING * INTO r;
 RETURN jsonb_build_object('id',r.id);
END IF;
IF p_action IN ('preview','join') THEN
 SELECT * INTO r FROM public.guest_chats WHERE invite_hash = encode(sha256(convert_to(p_invite,'UTF8')),'hex') AND expires_at > now() FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Invitation expired or unavailable'; END IF;
 IF p_action = 'preview' THEN RETURN jsonb_build_object('id',r.id,'profile',r.profile_a,'joined',r.b_hash IS NOT NULL); END IF;
 IF r.a_hash = h THEN RAISE EXCEPTION 'Open this invitation in the other person''s browser'; END IF;
 IF r.b_hash IS NOT NULL AND r.b_hash <> h THEN RAISE EXCEPTION 'This invitation has already been accepted'; END IF;
 IF p_profile IS NULL OR length(p_profile::text)>20000 OR coalesce(p_profile->>'name','')='' THEN RAISE EXCEPTION 'Create your taste profile first'; END IF;
 UPDATE public.guest_chats SET b_hash=h,profile_b=p_profile WHERE id=r.id RETURNING * INTO r;
 RETURN jsonb_build_object('id',r.id,'profile',r.profile_a);
END IF;
SELECT * INTO r FROM public.guest_chats WHERE id=p_room AND expires_at>now() FOR UPDATE;
IF r.id IS NULL THEN RAISE EXCEPTION 'Chat expired or unavailable'; END IF;
IF h=r.a_hash THEN side:='a'; ELSIF h=r.b_hash THEN side:='b'; ELSE RAISE EXCEPTION 'Private chat access denied'; END IF;
IF p_action='send' THEN
 IF r.b_hash IS NULL THEN RAISE EXCEPTION 'Waiting for the other person to join'; END IF;
 IF length(trim(p_text))=0 OR length(p_text)>2000 OR length(p_message_id)<8 OR length(p_message_id)>100 THEN RAISE EXCEPTION 'Invalid message'; END IF;
 IF jsonb_array_length(r.messages)>=300 THEN RAISE EXCEPTION 'This conversation is full'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r.messages) m WHERE m->>'id'=p_message_id) THEN
 UPDATE public.guest_chats SET messages=messages || jsonb_build_array(jsonb_build_object('id',p_message_id,'sender',side,'content',trim(p_text),'at',now())) WHERE id=r.id RETURNING * INTO r;
 END IF;
ELSIF p_action='claim' THEN
 IF r.b_hash IS NULL THEN RAISE EXCEPTION 'Waiting for the other person to join'; END IF;
 IF r.claim IS NOT NULL AND r.claimed_at>now()-interval '3 minutes' THEN RETURN jsonb_build_object('claimed',false); END IF;
 SELECT coalesce(bool_or(m->>'sender'='a'),false), coalesce(bool_or(m->>'sender'='b'),false) INTO answer_a,answer_b FROM jsonb_array_elements(r.messages) WITH ORDINALITY AS t(m,i) WHERE i>r.last_rue_index;
 IF r.game IS NOT NULL AND r.rue_error IS NULL AND NOT(answer_a AND answer_b) THEN RETURN jsonb_build_object('claimed',false); END IF;
 IF length(p_mood)>40 THEN RAISE EXCEPTION 'Invalid mood'; END IF;
 claimed:=gen_random_uuid();
 UPDATE public.guest_chats SET claim=claimed,claimed_at=now(),rue_error=NULL,mood=coalesce(mood,nullif(p_mood,''),'getting_to_know_you') WHERE id=r.id RETURNING * INTO r;
 RETURN jsonb_build_object('claimed',true,'claim',claimed,'a',r.profile_a,'b',r.profile_b,'messages',r.messages,'scores',r.scores,'mood',r.mood,'game',r.game);
ELSIF p_action <> 'read' THEN RAISE EXCEPTION 'Unknown chat action'; END IF;
RETURN jsonb_build_object('id',r.id,'side',side,'a',r.profile_a,'b',r.profile_b,'messages',r.messages,'game',r.game,'scores',r.scores,'mood',r.mood,'tools',r.tools,'busy',r.claim IS NOT NULL AND r.claimed_at>now()-interval '3 minutes','error',r.rue_error);
END $$;
REVOKE ALL ON FUNCTION public.guest_chat_access(text,uuid,text,text,jsonb,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_chat_access(text,uuid,text,text,jsonb,text,text,text) TO anon,authenticated,service_role;
CREATE FUNCTION public.finish_guest_chat(p_room uuid,p_claim uuid,p_turn jsonb,p_tools jsonb,p_error text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.guest_chats; m jsonb; total integer;
BEGIN
 SELECT * INTO r FROM public.guest_chats WHERE id=p_room AND claim=p_claim FOR UPDATE;
 IF r.id IS NULL THEN RETURN false; END IF;
 IF p_error IS NOT NULL THEN UPDATE public.guest_chats SET claim=NULL,rue_error=left(p_error,1000) WHERE id=p_room; RETURN true; END IF;
 total:=jsonb_array_length(r.messages);
 FOR m IN SELECT value FROM jsonb_array_elements(p_turn->'messages') LOOP
 r.messages:=r.messages || jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'sender','rue','content',m->>'content','at',now()));
 END LOOP;
 UPDATE public.guest_chats SET messages=r.messages,game=p_turn->'game',scores=p_turn->'points',tools=p_tools,claim=NULL,rue_error=NULL,last_rue_index=total WHERE id=p_room;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.finish_guest_chat(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_guest_chat(uuid,uuid,jsonb,jsonb,text) TO service_role;
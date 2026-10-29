CREATE OR REPLACE FUNCTION public.shared_taste_profile(p_profile jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE WHEN p_profile IS NULL OR p_profile='null'::jsonb THEN p_profile ELSE
 (p_profile - 'lifestyle') || CASE WHEN jsonb_typeof(p_profile->'lifestyle'->'shared')='array' THEN
 jsonb_build_object('lifestyle', coalesce((SELECT jsonb_object_agg(key,value) FROM jsonb_each(p_profile->'lifestyle') WHERE key IN ('alcohol','tobacco','cannabis','openToPartner') AND (p_profile->'lifestyle'->'shared') ? key), '{}'::jsonb)) ELSE '{}'::jsonb END END;
$$;
REVOKE ALL ON FUNCTION public.shared_taste_profile(jsonb) FROM PUBLIC;
ALTER FUNCTION public.guest_chat_access(text,uuid,text,text,jsonb,text,text,text) RENAME TO guest_chat_access_consent_base;
REVOKE ALL ON FUNCTION public.guest_chat_access_consent_base(text,uuid,text,text,jsonb,text,text,text) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.guest_chat_access(p_action text, p_room uuid DEFAULT NULL, p_token text DEFAULT '', p_invite text DEFAULT '', p_profile jsonb DEFAULT NULL, p_text text DEFAULT '', p_message_id text DEFAULT '', p_mood text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; field text;
BEGIN
 IF p_action='profile' THEN
  result := public.guest_chat_access_consent_base('read',p_room,p_token);
  IF p_profile IS NULL OR length(p_profile::text)>20000 OR coalesce(p_profile->>'name','')='' THEN RAISE EXCEPTION 'Invalid profile'; END IF;
  IF result->>'side'='a' THEN UPDATE public.guest_chats SET profile_a=p_profile WHERE id=p_room;
  ELSE UPDATE public.guest_chats SET profile_b=p_profile WHERE id=p_room; END IF;
  result := public.guest_chat_access_consent_base('read',p_room,p_token);
 ELSE
  result := public.guest_chat_access_consent_base(p_action,p_room,p_token,p_invite,p_profile,p_text,p_message_id,p_mood);
 END IF;
 FOREACH field IN ARRAY ARRAY['a','b','profile'] LOOP
  IF result ? field THEN result := jsonb_set(result,ARRAY[field],public.shared_taste_profile(result->field)); END IF;
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.guest_chat_access(text,uuid,text,text,jsonb,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_chat_access(text,uuid,text,text,jsonb,text,text,text) TO anon,authenticated,service_role;
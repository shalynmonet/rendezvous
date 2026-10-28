CREATE TABLE public.account_workspaces (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_workspaces TO authenticated;
GRANT ALL ON public.account_workspaces TO service_role;
ALTER TABLE public.account_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own workspace" ON public.account_workspaces FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.save_account_workspace(p_data jsonb, p_revision bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE result public.account_workspaces;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  INSERT INTO public.account_workspaces(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
  UPDATE public.account_workspaces SET data = p_data, revision = revision + 1, updated_at = now() WHERE user_id = auth.uid() AND revision = p_revision RETURNING * INTO result;
  IF NOT FOUND THEN RETURN jsonb_build_object('conflict', true); END IF;
  RETURN jsonb_build_object('conflict', false, 'revision', result.revision);
END;
$$;
REVOKE ALL ON FUNCTION public.save_account_workspace(jsonb,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_account_workspace(jsonb,bigint) TO authenticated;
CREATE TABLE public.account_room_links (
  user_id uuid NOT NULL,
  room_id uuid NOT NULL,
  participant_key text NOT NULL,
  PRIMARY KEY(user_id, room_id)
);
REVOKE ALL ON public.account_room_links FROM anon, authenticated;
GRANT ALL ON public.account_room_links TO service_role;
ALTER TABLE public.account_room_links ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.account_room_links IS 'Private capability backup. Only authenticated server handlers after room capability verification may write; never included in saved chat snapshots.';
CREATE TABLE public.saved_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id text NOT NULL,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_chats TO authenticated;
GRANT ALL ON public.saved_chats TO service_role;
ALTER TABLE public.saved_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved chats" ON public.saved_chats FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX saved_chats_owner_updated ON public.saved_chats (user_id, updated_at DESC);
REVOKE ALL ON public.saved_chats FROM anon;
REVOKE ALL ON public.saved_chats FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_chats TO authenticated;
GRANT ALL ON public.saved_chats TO service_role;
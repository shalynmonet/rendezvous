CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.concierge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_name text NOT NULL,
  planner_email text NOT NULL,
  loved_one_name text NOT NULL,
  occasion text NOT NULL DEFAULT '',
  format text NOT NULL DEFAULT 'date',
  city_or_destination text NOT NULL DEFAULT '',
  dates text NOT NULL DEFAULT '',
  budget text NOT NULL DEFAULT '',
  loved_one_tastes jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  taste_portrait jsonb,
  draft_plan jsonb,
  status text NOT NULL DEFAULT 'new',
  shalyn_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.concierge_requests TO authenticated;
GRANT ALL ON public.concierge_requests TO service_role;
ALTER TABLE public.concierge_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read" ON public.concierge_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update" ON public.concierge_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.concierge_requests (planner_name, planner_email, loved_one_name, occasion, format, city_or_destination, dates, budget, loved_one_tastes, notes, taste_portrait, draft_plan, status)
VALUES ('Marcus (demo)', 'marcus@example.com', 'Simone', '5-year anniversary', 'date', 'Chicago', 'Sat Nov 14', '$300', 
'[{"category":"artist","label":"Sade"},{"category":"film","label":"In the Mood for Love"},{"category":"cuisine","label":"Omakase"},{"category":"artist","label":"Erykah Badu"}]'::jsonb,
'She loves slow evenings and hates crowds.',
'{"headline":"A connoisseur of slow-burn romance","summary":"Simone gravitates to warm, sensual, unhurried art: Sade''s smoke-and-velvet soul, Wong Kar-wai''s lingering frames, and the quiet ritual of omakase.","signals":[{"label":"Velvet soul","reason":"Qloo links Sade and Erykah Badu to an audience that favors intimate, low-lit venues."},{"label":"Cinematic restraint","reason":"In the Mood for Love fans skew toward precise, chef-driven dining."}],"surprise":"Try a vinyl listening bar: Qloo affinity between neo-soul fans and listening rooms is high."}'::jsonb,
'{"stops":[{"type":"dinner","name":"Omakase counter (to be booked)","reason":"Matches her omakase love and preference for quiet, intimate rooms."},{"type":"activity","name":"Museum of Contemporary Photography","reason":"Quiet, visual, unhurried, like the films she loves."},{"type":"nightcap","name":"Listening bar","reason":"Neo-soul audiences show strong affinity for vinyl rooms."}]}'::jsonb,
'new');
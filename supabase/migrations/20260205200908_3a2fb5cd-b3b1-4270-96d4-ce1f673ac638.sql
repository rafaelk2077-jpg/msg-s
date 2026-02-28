
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Publications are viewable by everyone" ON public.publications;
DROP POLICY IF EXISTS "Admins can manage publications" ON public.publications;

-- Recreate as PERMISSIVE policies (correct behavior)
CREATE POLICY "Publications are viewable by everyone"
ON public.publications
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage publications"
ON public.publications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

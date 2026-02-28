-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create PERMISSIVE policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing restrictive policies on publications  
DROP POLICY IF EXISTS "Anyone can view publications" ON public.publications;
DROP POLICY IF EXISTS "Admins can insert publications" ON public.publications;
DROP POLICY IF EXISTS "Admins can update publications" ON public.publications;
DROP POLICY IF EXISTS "Admins can delete publications" ON public.publications;

-- Create PERMISSIVE policies for publications
CREATE POLICY "Anyone can view publications"
ON public.publications
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert publications"
ON public.publications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update publications"
ON public.publications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete publications"
ON public.publications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert admin role for the current user (bypassing RLS with service role would be needed, 
-- but we can insert directly since this runs as superuser)
INSERT INTO public.user_roles (user_id, role)
VALUES ('5fe95945-6f2c-459c-a1b7-6478c5ac4eb1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
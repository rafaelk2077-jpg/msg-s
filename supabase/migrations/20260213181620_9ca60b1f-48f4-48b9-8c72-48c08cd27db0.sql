
-- Allow admins to view all form submissions
CREATE POLICY "Admins can view all submissions"
ON public.form_submissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

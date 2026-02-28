
-- Add reviewed flag and admin notes to form_submissions
ALTER TABLE public.form_submissions
  ADD COLUMN reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN admin_notes text;

-- Allow admins to update form_submissions (for marking reviewed and adding notes)
CREATE POLICY "Admins can update submissions"
  ON public.form_submissions
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

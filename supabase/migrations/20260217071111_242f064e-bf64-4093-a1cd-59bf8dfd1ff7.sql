-- Drop existing foreign key and recreate with ON DELETE SET NULL
ALTER TABLE public.form_submissions
  DROP CONSTRAINT IF EXISTS form_submissions_user_id_fkey;

ALTER TABLE public.form_submissions
  ADD CONSTRAINT form_submissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
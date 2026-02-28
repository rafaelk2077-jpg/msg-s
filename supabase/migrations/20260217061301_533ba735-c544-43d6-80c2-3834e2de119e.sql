
-- Create publication_ratings table
CREATE TABLE public.publication_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, publication_id)
);

-- Enable RLS
ALTER TABLE public.publication_ratings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert own rating"
ON public.publication_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rating"
ON public.publication_ratings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ratings"
ON public.publication_ratings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings"
ON public.publication_ratings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

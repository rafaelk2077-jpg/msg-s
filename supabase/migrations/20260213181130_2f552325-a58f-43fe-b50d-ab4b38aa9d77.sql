
-- Table to track publication reads
CREATE TABLE public.publication_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone
);

-- Indexes for fast queries
CREATE INDEX idx_publication_reads_user ON public.publication_reads(user_id);
CREATE INDEX idx_publication_reads_publication ON public.publication_reads(publication_id);
CREATE INDEX idx_publication_reads_read_at ON public.publication_reads(read_at DESC);
CREATE UNIQUE INDEX idx_publication_reads_unique ON public.publication_reads(user_id, publication_id);

-- Enable RLS
ALTER TABLE public.publication_reads ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reads
CREATE POLICY "Users can insert own reads"
ON public.publication_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own reads (mark completed)
CREATE POLICY "Users can update own reads"
ON public.publication_reads FOR UPDATE
USING (auth.uid() = user_id);

-- Users can view own reads
CREATE POLICY "Users can view own reads"
ON public.publication_reads FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all reads
CREATE POLICY "Admins can view all reads"
ON public.publication_reads FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

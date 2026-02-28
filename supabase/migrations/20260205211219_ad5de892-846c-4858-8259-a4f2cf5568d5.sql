-- Add type column to publications table
ALTER TABLE public.publications 
ADD COLUMN type text;
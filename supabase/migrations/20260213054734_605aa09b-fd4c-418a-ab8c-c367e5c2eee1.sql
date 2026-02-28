
-- Create storage bucket for form photo uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('form-photos', 'form-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload form photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'form-photos' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Form photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'form-photos');

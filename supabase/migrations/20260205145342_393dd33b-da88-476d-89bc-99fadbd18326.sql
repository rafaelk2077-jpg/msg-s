-- Create storage bucket for publication files
INSERT INTO storage.buckets (id, name, public) VALUES ('publications', 'publications', true);

-- Allow public read access to publication files
CREATE POLICY "Public can view publication files"
ON storage.objects FOR SELECT
USING (bucket_id = 'publications');

-- Allow admins to upload publication files
CREATE POLICY "Admins can upload publication files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'publications' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update publication files
CREATE POLICY "Admins can update publication files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'publications' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete publication files
CREATE POLICY "Admins can delete publication files"
ON storage.objects FOR DELETE
USING (bucket_id = 'publications' AND public.has_role(auth.uid(), 'admin'));
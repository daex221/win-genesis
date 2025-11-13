-- Create the missing prize-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prize-files',
  'prize-files',
  true,
  52428800, -- 50MB limit
  ARRAY['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*']
)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for prize-files bucket
CREATE POLICY "Admins can upload prize files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prize-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.app_role = 'admin'
  )
);

CREATE POLICY "Anyone can view prize files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'prize-files');

CREATE POLICY "Admins can delete prize files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'prize-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.app_role = 'admin'
  )
);
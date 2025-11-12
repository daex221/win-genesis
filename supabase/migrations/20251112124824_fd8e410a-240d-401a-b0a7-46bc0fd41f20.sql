-- Create prize-audio storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('prize-audio', 'prize-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for prize-audio bucket
CREATE POLICY "Prize audio files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prize-audio');

CREATE POLICY "Admins can upload prize audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prize-audio' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.app_role = 'admin'
    )
  );

CREATE POLICY "Service role can manage prize audio"
  ON storage.objects FOR ALL
  USING (bucket_id = 'prize-audio');
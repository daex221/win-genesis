-- Create prize_content_pool table
-- This allows each prize to have multiple content items that rotate
-- so users don't get the same exact content twice

CREATE TABLE IF NOT EXISTS prize_content_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id UUID NOT NULL REFERENCES prize_metadata(id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  content_type TEXT, -- 'video', 'photo', 'code', 'link', 'message'
  content_name TEXT, -- friendly name for admin reference
  sequence_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prize_content_pool_prize_id 
ON prize_content_pool(prize_id);

-- Add RLS policy
ALTER TABLE prize_content_pool ENABLE ROW LEVEL SECURITY;

-- Allow public read (for getting random content)
CREATE POLICY "Allow public read prize content pool"
  ON prize_content_pool FOR SELECT
  USING (is_active = true);

-- Allow admins to manage content pool
CREATE POLICY "Allow admins to manage content pool"
  ON prize_content_pool FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prize_content_pool_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prize_content_pool_timestamp
  BEFORE UPDATE ON prize_content_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_prize_content_pool_timestamp();
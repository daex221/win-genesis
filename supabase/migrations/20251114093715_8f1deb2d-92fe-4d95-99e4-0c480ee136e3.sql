-- Create pricing_config table
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,
  price numeric NOT NULL,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Allow public to read active pricing
CREATE POLICY "Anyone can view active pricing"
  ON public.pricing_config
  FOR SELECT
  USING (active = true);

-- Allow admins to manage pricing
CREATE POLICY "Admins can manage pricing"
  ON public.pricing_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default pricing tiers
INSERT INTO public.pricing_config (tier, price, active) VALUES
  ('basic', 15, true),
  ('gold', 30, true),
  ('vip', 50, true)
ON CONFLICT (tier) DO NOTHING;

-- Ensure prize_delivery table has correct schema
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prize_delivery' AND column_name = 'delivery_content_basic') THEN
    ALTER TABLE public.prize_delivery ADD COLUMN delivery_content_basic text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prize_delivery' AND column_name = 'delivery_content_gold') THEN
    ALTER TABLE public.prize_delivery ADD COLUMN delivery_content_gold text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prize_delivery' AND column_name = 'delivery_content_vip') THEN
    ALTER TABLE public.prize_delivery ADD COLUMN delivery_content_vip text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prize_delivery' AND column_name = 'is_tier_specific') THEN
    ALTER TABLE public.prize_delivery ADD COLUMN is_tier_specific boolean NOT NULL DEFAULT false;
  END IF;
END $$;
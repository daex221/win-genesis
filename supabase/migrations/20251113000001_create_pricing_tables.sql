-- Create pricing_config table for dynamic tier pricing
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('basic', 'gold', 'vip')),
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  stripe_price_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pricing_history table for audit trail
CREATE TABLE IF NOT EXISTS public.pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'gold', 'vip')),
  old_price NUMERIC(10, 2),
  new_price NUMERIC(10, 2) NOT NULL,
  old_stripe_price_id TEXT,
  new_stripe_price_id TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create wallet_config table for configurable wallet settings
CREATE TABLE IF NOT EXISTS public.wallet_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_config_tier ON public.pricing_config(tier);
CREATE INDEX IF NOT EXISTS idx_pricing_config_active ON public.pricing_config(active);
CREATE INDEX IF NOT EXISTS idx_pricing_history_tier ON public.pricing_history(tier);
CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON public.pricing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_config_key ON public.wallet_config(setting_key);

-- Insert default pricing (matching current hardcoded values)
INSERT INTO public.pricing_config (tier, price, stripe_price_id, active) VALUES
  ('basic', 15.00, 'price_1SQv6AHjsWcGd0CyeT7T7CVr', true),
  ('gold', 30.00, 'price_1SQv6aHjsWcGd0CyPpsIdS8t', true),
  ('vip', 50.00, 'price_1SQv6oHjsWcGd0Cyz8SdGPzQ', true)
ON CONFLICT (tier) DO NOTHING;

-- Insert default wallet configuration
INSERT INTO public.wallet_config (setting_key, setting_value, description) VALUES
  ('minimum_topup', '{"amount": 10}', 'Minimum amount required to top up wallet'),
  ('quick_amounts', '{"amounts": [15, 30, 50, 100]}', 'Quick select amounts for wallet top-up')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_config (public read, admin write)
CREATE POLICY "Anyone can view active pricing"
  ON public.pricing_config
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can insert pricing"
  ON public.pricing_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND app_role = 'admin'
    )
  );

CREATE POLICY "Admins can update pricing"
  ON public.pricing_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND app_role = 'admin'
    )
  );

-- RLS Policies for pricing_history (admin read only)
CREATE POLICY "Admins can view pricing history"
  ON public.pricing_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND app_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert pricing history"
  ON public.pricing_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND app_role = 'admin'
    )
  );

-- RLS Policies for wallet_config (public read, admin write)
CREATE POLICY "Anyone can view wallet config"
  ON public.wallet_config
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update wallet config"
  ON public.wallet_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND app_role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on pricing_config
CREATE TRIGGER update_pricing_config_updated_at
  BEFORE UPDATE ON public.pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on wallet_config
CREATE TRIGGER update_wallet_config_updated_at
  BEFORE UPDATE ON public.wallet_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log pricing changes to history
CREATE OR REPLACE FUNCTION log_pricing_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.price IS DISTINCT FROM NEW.price) OR (OLD.stripe_price_id IS DISTINCT FROM NEW.stripe_price_id) THEN
    INSERT INTO public.pricing_history (
      tier,
      old_price,
      new_price,
      old_stripe_price_id,
      new_stripe_price_id,
      changed_by
    ) VALUES (
      NEW.tier,
      OLD.price,
      NEW.price,
      OLD.stripe_price_id,
      NEW.stripe_price_id,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log pricing changes
CREATE TRIGGER log_pricing_config_changes
  AFTER UPDATE ON public.pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION log_pricing_change();

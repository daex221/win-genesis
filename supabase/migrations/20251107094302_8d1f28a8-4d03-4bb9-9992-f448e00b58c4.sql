-- Create prizes table
CREATE TABLE IF NOT EXISTS public.prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('digital_link', 'code', 'message')),
  weight_basic INTEGER NOT NULL DEFAULT 0,
  weight_gold INTEGER NOT NULL DEFAULT 0,
  weight_vip INTEGER NOT NULL DEFAULT 0,
  delivery_content TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create spins table
CREATE TABLE IF NOT EXISTS public.spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'gold', 'vip')),
  prize_id UUID NOT NULL REFERENCES public.prizes(id),
  stripe_payment_id TEXT,
  amount_paid NUMERIC(10, 2) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'gold', 'vip')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spins_email ON public.spins(email);
CREATE INDEX IF NOT EXISTS idx_spins_created_at ON public.spins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_session_id ON public.transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_prizes_active ON public.prizes(active);

-- Insert default prize data
INSERT INTO public.prizes (name, emoji, type, weight_basic, weight_gold, weight_vip, delivery_content, active) VALUES
  ('Secret Photo Drop', '💌', 'digital_link', 25, 20, 15, 'https://example.com/secret-photo', true),
  ('Mystery Video Clip', '🎥', 'digital_link', 20, 25, 20, 'https://example.com/mystery-video', true),
  ('Voice Note', '🔊', 'digital_link', 20, 20, 25, 'https://example.com/voice-note', true),
  ('Custom Shout-Out', '🎤', 'message', 15, 15, 20, 'You won a custom shout-out! Reply to this email with your request.', true),
  ('Priority DM Access', '⚡️', 'digital_link', 10, 10, 10, 'https://example.com/priority-dm', true),
  ('Double Spin Bonus', '🌀', 'code', 5, 5, 5, 'DOUBLESPIN2024', true),
  ('Merch Discount Code', '💳', 'code', 3, 3, 3, 'MERCH50OFF', true),
  ('VIP Exclusive Access', '🔒', 'digital_link', 2, 2, 2, 'https://example.com/vip-exclusive', true)
ON CONFLICT DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prizes (publicly readable for active prizes)
CREATE POLICY "Anyone can view active prizes"
  ON public.prizes
  FOR SELECT
  USING (active = true);

-- Create RLS policies for spins (users can only view their own spins)
CREATE POLICY "Users can view their own spins"
  ON public.spins
  FOR SELECT
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Create RLS policies for transactions (users can only view their own transactions)
CREATE POLICY "Users can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');
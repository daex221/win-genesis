-- Feature 1: Vouchers table for discount system
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 20,
  tier TEXT CHECK (tier IN ('basic', 'gold', 'vip')),
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX idx_vouchers_used ON vouchers(used);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vouchers"
  ON vouchers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all vouchers"
  ON vouchers FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Feature 3: Shout-out requests table
CREATE TABLE IF NOT EXISTS shout_out_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  spin_id UUID,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_shout_out_requests_user_id ON shout_out_requests(user_id);
CREATE INDEX idx_shout_out_requests_status ON shout_out_requests(status);

ALTER TABLE shout_out_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shout-out requests"
  ON shout_out_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all shout-out requests"
  ON shout_out_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update shout-out requests"
  ON shout_out_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Feature 5: User prize history for content rotation
CREATE TABLE IF NOT EXISTS user_prize_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prize_id UUID NOT NULL REFERENCES prize_metadata(id) ON DELETE CASCADE,
  content_id UUID REFERENCES prize_content_pool(id) ON DELETE SET NULL,
  content_url TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_user_prize_history_user_id ON user_prize_history(user_id);
CREATE INDEX idx_user_prize_history_prize_id ON user_prize_history(prize_id);
CREATE INDEX idx_user_prize_history_content_id ON user_prize_history(content_id);

ALTER TABLE user_prize_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prize history"
  ON user_prize_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all prize history"
  ON user_prize_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Feature 6: Admin notifications (replace N8N)
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('manual_prize', 'shout_out', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  spin_id UUID,
  user_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications"
  ON admin_notifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
  ON admin_notifications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));
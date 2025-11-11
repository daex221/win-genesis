-- Add fulfillment_type to prize_metadata table
ALTER TABLE public.prize_metadata
ADD COLUMN fulfillment_type text NOT NULL DEFAULT 'automatic';

-- Add comment to explain the column
COMMENT ON COLUMN public.prize_metadata.fulfillment_type IS 'Type of prize fulfillment: automatic (instant delivery) or manual (requires admin action)';

-- Add fulfillment tracking to spins table
ALTER TABLE public.spins
ADD COLUMN fulfillment_status text NOT NULL DEFAULT 'pending',
ADD COLUMN fulfilled_at timestamp with time zone;

-- Add comments
COMMENT ON COLUMN public.spins.fulfillment_status IS 'Status of prize fulfillment: pending, delivered, completed';
COMMENT ON COLUMN public.spins.fulfilled_at IS 'Timestamp when prize was fulfilled';

-- Create email_logs table
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL,
  spin_id uuid REFERENCES public.spins(id),
  email_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sendgrid_message_id text,
  sent_at timestamp with time zone DEFAULT now(),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all email logs
CREATE POLICY "Admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create webhook_logs table
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spin_id uuid REFERENCES public.spins(id),
  webhook_url text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_code integer,
  sent_at timestamp with time zone DEFAULT now(),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all webhook logs
CREATE POLICY "Admins can view all webhook logs"
ON public.webhook_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index on fulfillment_status for faster queries
CREATE INDEX idx_spins_fulfillment_status ON public.spins(fulfillment_status);

-- Create index on email_logs for faster queries
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_spin_id ON public.email_logs(spin_id);

-- Create index on webhook_logs for faster queries
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX idx_webhook_logs_spin_id ON public.webhook_logs(spin_id);
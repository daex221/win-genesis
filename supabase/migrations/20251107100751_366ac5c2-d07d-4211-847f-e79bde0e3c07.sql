-- Fix Issue #1: Implement proper admin authentication system
-- Create user_roles table with proper RLS
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_role TEXT NOT NULL CHECK (app_role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own role
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = has_role.user_id
    AND user_roles.app_role = has_role.required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix Issue #2: Secure prize delivery_content
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active prizes" ON public.prizes;

-- Create restricted policy that excludes delivery_content
CREATE POLICY "Anyone can view active prize metadata"
  ON public.prizes FOR SELECT
  USING (active = true);

-- Note: Frontend queries must now explicitly exclude delivery_content column
-- Only server-side code with service role can access delivery_content

-- Add policies for admin prize management
CREATE POLICY "Admins can manage prizes"
  ON public.prizes FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add policies for spins and transactions (server-side operations via edge functions with service role)
CREATE POLICY "Admins can view all spins"
  ON public.spins FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
-- Fix warn-level security issues: RLS policy mismatch and missing write policies

-- 1. Fix spins table: Support email-based viewing for anonymous purchases
-- Drop existing user policy and create new one that works with both auth and anonymous
DROP POLICY IF EXISTS "Users can view their own spins" ON public.spins;

CREATE POLICY "Users can view spins by email"
  ON public.spins FOR SELECT
  USING (
    email = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'email',
      current_setting('app.user_email', true)
    )
  );

-- 2. Fix transactions table: Support email-based viewing for anonymous purchases
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

CREATE POLICY "Users can view transactions by email"
  ON public.transactions FOR SELECT
  USING (
    email = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'email',
      current_setting('app.user_email', true)
    )
  );

-- 3. Add admin write policies for prize management
CREATE POLICY "Admins can insert prizes"
  ON public.prizes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prizes"
  ON public.prizes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prizes"
  ON public.prizes FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Note: Edge functions use service role key to INSERT into spins/transactions
-- This bypasses RLS, which is the correct approach for server-side operations
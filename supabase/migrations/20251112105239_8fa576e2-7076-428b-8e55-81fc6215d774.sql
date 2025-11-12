-- Fix search_path security issue for the timestamp function
CREATE OR REPLACE FUNCTION update_prize_content_pool_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
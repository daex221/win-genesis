-- Add tier-specific delivery content for prizes
-- This allows admins to set different mystery videos/content for each tier

-- Step 1: Add new columns for tier-specific delivery content
ALTER TABLE public.prize_delivery
  ADD COLUMN delivery_content_basic text,
  ADD COLUMN delivery_content_gold text,
  ADD COLUMN delivery_content_vip text,
  ADD COLUMN is_tier_specific boolean NOT NULL DEFAULT false;

-- Step 2: Migrate existing data to shared content (backward compatibility)
-- Existing prizes will use the same content for all tiers initially
UPDATE public.prize_delivery
SET
  delivery_content_basic = delivery_content,
  delivery_content_gold = delivery_content,
  delivery_content_vip = delivery_content,
  is_tier_specific = false;

-- Step 3: Make the new columns NOT NULL after migration
ALTER TABLE public.prize_delivery
  ALTER COLUMN delivery_content_basic SET NOT NULL,
  ALTER COLUMN delivery_content_gold SET NOT NULL,
  ALTER COLUMN delivery_content_vip SET NOT NULL;

-- Step 4: Rename old column to indicate it's deprecated (but keep for backward compatibility)
ALTER TABLE public.prize_delivery
  RENAME COLUMN delivery_content TO delivery_content_legacy;

-- Step 5: Make legacy column nullable since we'll use tier-specific columns
ALTER TABLE public.prize_delivery
  ALTER COLUMN delivery_content_legacy DROP NOT NULL;

-- Step 6: Add comments to explain the new structure
COMMENT ON COLUMN public.prize_delivery.is_tier_specific IS
  'If true, uses tier-specific content (delivery_content_basic/gold/vip). If false, all tiers get the same content.';

COMMENT ON COLUMN public.prize_delivery.delivery_content_basic IS
  'Content delivered to Basic tier users (video link, image, code, or message)';

COMMENT ON COLUMN public.prize_delivery.delivery_content_gold IS
  'Content delivered to Gold tier users (video link, image, code, or message)';

COMMENT ON COLUMN public.prize_delivery.delivery_content_vip IS
  'Content delivered to VIP tier users (video link, image, code, or message)';
# Tier-Specific Mystery Video Content - Implementation Guide

## Overview
This feature allows you to upload **different mystery videos and content for each tier** (Basic, Gold, VIP). Now VIP users can get exclusive premium content that Basic and Gold users won't see!

---

## What Changed?

### 1. **Database Updates**
- Added new columns to `prize_delivery` table:
  - `delivery_content_basic` - Content for Basic tier users
  - `delivery_content_gold` - Content for Gold tier users
  - `delivery_content_vip` - Content for VIP tier users
  - `is_tier_specific` - Toggle to enable/disable tier-specific content

### 2. **Admin Panel Enhancements**
- New toggle: "Use tier-specific content"
- When enabled, you'll see 3 separate text areas (one for each tier)
- Color-coded by tier: Green (Basic), Gold (Gold), Purple (VIP)
- Helpful examples and placeholders for each tier

### 3. **Backend Logic**
- `spin-prize` function now delivers content based on user's tier
- `spin-with-wallet` function also respects tier-specific content
- Backward compatible with existing prizes (uses shared content if tier-specific is disabled)

---

## Deployment Steps

### Step 1: Apply Database Migration
```bash
cd /Users/user/win-genesis

# Push the migration to Supabase
npx supabase db push

# OR manually run the SQL in Supabase Dashboard:
# Go to: https://app.supabase.com/project/YOUR_PROJECT/editor
# Copy and paste contents of: supabase/migrations/20251113200000_add_tier_specific_delivery.sql
```

### Step 2: Deploy Updated Edge Functions
```bash
# Deploy the updated spin-prize function
npx supabase functions deploy spin-prize

# Deploy the updated spin-with-wallet function
npx supabase functions deploy spin-with-wallet
```

### Step 3: Deploy Frontend Updates
```bash
# Build the frontend with updated admin panel
npm run build

# Deploy to your hosting platform (Vercel/Netlify/etc.)
# The exact command depends on your setup
```

---

## How to Use (For Your Client)

### Setting Up Tier-Specific Mystery Videos

1. **Login to Admin Panel**
   - Go to your website's `/admin` page
   - Login with admin credentials

2. **Navigate to Prize Management**
   - Scroll to the "Prize Management" section
   - Find the "Mystery Video" prize or create a new one

3. **Enable Tier-Specific Content**
   - Click "Edit" on the Mystery Video prize
   - Check the box: ☑️ **"Use tier-specific content"**

4. **Upload Different Videos for Each Tier**
   - You'll see 3 color-coded sections:

   📗 **Basic Tier Content** (Green)
   ```
   Example: https://youtu.be/BASIC_TEASER_VIDEO
   Or: https://drive.google.com/file/d/BASIC_VIDEO_ID
   ```

   📙 **Gold Tier Content** (Yellow/Gold)
   ```
   Example: https://youtu.be/GOLD_FULL_VIDEO
   Or: https://drive.google.com/file/d/GOLD_VIDEO_ID
   ```

   📕 **VIP Tier Content** (Purple)
   ```
   Example: https://youtu.be/VIP_EXCLUSIVE_EXTENDED_CUT
   Or: https://drive.google.com/file/d/VIP_BONUS_VIDEO_ID
   ```

5. **Save Changes**
   - Click "Save Changes"
   - Done! Each tier now gets different content

---

## Content Strategy Examples

### Example 1: Progressive Video Reveal
- **Basic**: 30-second teaser clip
- **Gold**: Full 5-minute video
- **VIP**: Extended 10-minute cut with behind-the-scenes footage

### Example 2: Quality Tiers
- **Basic**: 720p video
- **Gold**: 1080p HD video
- **VIP**: 4K Ultra HD video + bonus content

### Example 3: Exclusive Content
- **Basic**: Public music video
- **Gold**: Exclusive acoustic version
- **VIP**: Live performance + meet & greet invite

### Example 4: Bundle Value
- **Basic**: Single photo
- **Gold**: Photo set (5 images)
- **VIP**: Photo set + HD video + downloadable wallpapers

---

## Technical Details

### Supported Content Types
All tier-specific fields support:
- ✅ Video links (YouTube, Vimeo, Google Drive, Dropbox)
- ✅ Image links (direct URLs, Google Drive, Imgur)
- ✅ Discount codes (different % off per tier)
- ✅ Text messages (customized per tier)

### How the System Works
1. User pays and selects a tier (Basic/Gold/VIP)
2. Spin the wheel
3. Backend checks `is_tier_specific` flag:
   - If `true`: Returns content from tier-specific field
   - If `false`: Returns same content for all tiers
4. User receives their tier-appropriate prize

### Backward Compatibility
- Existing prizes without tier-specific content will work as before
- All tiers get the same content until you enable tier-specific mode
- No existing prizes will break

---

## Testing Checklist

### Database Testing
- [ ] Run migration: `npx supabase db push`
- [ ] Verify new columns exist in `prize_delivery` table
- [ ] Check that existing prizes still work

### Admin Panel Testing
- [ ] Login as admin
- [ ] Navigate to Prize Management
- [ ] Click "Edit" on any prize
- [ ] See the "Use tier-specific content" toggle
- [ ] Enable toggle and verify 3 text areas appear
- [ ] Disable toggle and verify single text area appears
- [ ] Save a prize with tier-specific content
- [ ] Verify data saves correctly in database

### Frontend Testing (Basic Tier)
- [ ] Purchase Basic tier or use wallet
- [ ] Spin the wheel
- [ ] Win the mystery video prize
- [ ] Verify you receive the BASIC tier content

### Frontend Testing (Gold Tier)
- [ ] Purchase Gold tier or use wallet
- [ ] Spin the wheel
- [ ] Win the mystery video prize
- [ ] Verify you receive the GOLD tier content (different from Basic)

### Frontend Testing (VIP Tier)
- [ ] Purchase VIP tier or use wallet
- [ ] Spin the wheel
- [ ] Win the mystery video prize
- [ ] Verify you receive the VIP tier content (different from Basic/Gold)

---

## Video Link Best Practices

### YouTube
- Use full links: `https://youtu.be/VIDEO_ID`
- Or: `https://www.youtube.com/watch?v=VIDEO_ID`
- Make sure video is set to "Unlisted" or "Public"

### Google Drive
- Share the video with "Anyone with the link"
- Use the shareable link: `https://drive.google.com/file/d/FILE_ID/view`
- Consider using: `https://drive.google.com/uc?export=view&id=FILE_ID` for direct viewing

### Vimeo
- Use full links: `https://vimeo.com/VIDEO_ID`
- Set video privacy to allow embedding

### Dropbox
- Use shared links: `https://www.dropbox.com/s/FILE_ID/video.mp4?dl=0`
- Change `dl=0` to `dl=1` for direct download

### Self-Hosted
- Use direct HTTPS URLs: `https://your-domain.com/videos/mystery-vip.mp4`
- Make sure CORS is enabled if hosting on a different domain

---

## Troubleshooting

### Problem: "All tier-specific delivery content is required" error
**Solution**: When tier-specific mode is enabled, you must fill in all 3 tier fields (Basic, Gold, VIP).

### Problem: Users report getting wrong tier content
**Solution**:
1. Check the backend logs: `npx supabase functions logs spin-prize`
2. Look for: `[SPIN-PRIZE] Using tier-specific content for X tier`
3. Verify the user's transaction shows the correct tier

### Problem: Migration fails
**Solution**:
1. Check if you have any existing prizes with NULL delivery_content
2. Run the migration in Supabase SQL Editor step by step
3. Check for error messages

### Problem: Admin panel doesn't show tier-specific toggle
**Solution**:
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Check browser console for errors
3. Verify frontend build and deployment was successful

---

## Support Notes

### For Your Development Team
- All changes are in `/Users/user/win-genesis/`
- Migration file: `supabase/migrations/20251113200000_add_tier_specific_delivery.sql`
- Updated files:
  - `src/components/EnhancedPrizeManagement.tsx`
  - `supabase/functions/spin-prize/index.ts`
  - `supabase/functions/spin-with-wallet/index.ts`

### Security Notes
- Prize delivery content is only visible to admins in admin panel
- Users only receive content when they win (post-payment)
- Tier verification happens server-side (cannot be spoofed)
- All content URLs should use HTTPS

---

## Future Enhancement Ideas

### Possible Future Features
1. **Scheduled Content**: Change content automatically on specific dates
2. **A/B Testing**: Test different content variants per tier
3. **Usage Analytics**: Track which tier content performs best
4. **Batch Upload**: Upload content for multiple prizes at once
5. **Preview Mode**: Preview content as different tiers before saving
6. **Content Templates**: Save and reuse content configurations
7. **Media Library**: Built-in storage for videos/images

---

## Questions?

If you encounter any issues during deployment or usage:
1. Check the browser console for errors
2. Check Supabase logs: `npx supabase functions logs`
3. Verify database migration completed successfully
4. Test with a small test prize first before updating live prizes

---

**Implementation Date**: November 13, 2025
**Version**: 1.0
**Status**: ✅ Ready for Deployment

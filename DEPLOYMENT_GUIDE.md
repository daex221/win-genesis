# Deployment Guide - Win Genesis Price Management Fixes

## 🚀 Quick Deployment Steps

Follow these steps to deploy all the price management fixes to your Lovable/Supabase project.

---

## Step 1: Apply Database Migrations

Since this was built on Lovable, you need to apply the SQL migration manually through the Supabase Dashboard:

### Option A: Via Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/rhmnvdxlobctihspbtwr)
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `supabase/migrations/20251113000001_create_pricing_tables.sql`
5. Paste into the SQL editor
6. Click "Run" to execute the migration
7. Verify success: Check that the following tables were created:
   - `pricing_config` (with 3 rows: basic, gold, vip)
   - `pricing_history` (empty initially)
   - `wallet_config` (with 2 rows: minimum_topup, quick_amounts)

### Option B: Via CLI (If linked)
```bash
npx supabase link --project-ref rhmnvdxlobctihspbtwr
npx supabase db push
```

**Verify Migration Success:**
Run this SQL in the SQL Editor to verify:
```sql
SELECT * FROM pricing_config;
SELECT * FROM wallet_config;
```

You should see 3 pricing tiers and 2 wallet config entries.

---

## Step 2: Deploy Edge Functions

Since your project is on Supabase, you'll need to deploy the new edge functions.

### Prerequisites
Install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

### Link Your Project
```bash
supabase login
supabase link --project-ref rhmnvdxlobctihspbtwr
```

### Deploy New Functions
```bash
# Deploy the new get-pricing endpoint
supabase functions deploy get-pricing

# Deploy the new update-pricing endpoint
supabase functions deploy update-pricing

# Redeploy updated functions
supabase functions deploy spin-with-wallet
supabase functions deploy create-checkout
```

**Verify Deployment:**
Check the Supabase Dashboard → Edge Functions to see all 4 functions deployed with recent timestamps.

---

## Step 3: Update Environment Variables

### Local Development
Your `.env` file already has:
```env
VITE_WEBHOOK_USERNAME="daevo"
VITE_WEBHOOK_PASSWORD="12345678"
```

### Production
If you're deploying to Vercel, Netlify, or another hosting platform:

1. **Vercel:**
   ```bash
   vercel env add VITE_WEBHOOK_USERNAME
   # Enter: daevo

   vercel env add VITE_WEBHOOK_PASSWORD
   # Enter: 12345678
   ```

2. **Netlify:**
   - Go to Site settings → Environment variables
   - Add `VITE_WEBHOOK_USERNAME` = `daevo`
   - Add `VITE_WEBHOOK_PASSWORD` = `12345678`

3. **Other Platforms:**
   Add the same environment variables in your platform's settings.

---

## Step 4: Build and Deploy Frontend

### Local Build Test
First, test the build locally:
```bash
npm run build
```

Fix any TypeScript errors if they occur.

### Deploy to Production

#### If using Vercel:
```bash
vercel --prod
```

#### If using Netlify:
```bash
netlify deploy --prod
```

#### If using Lovable's hosting:
1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "feat: Add dynamic price management and enhanced prize delivery"
   git push origin main
   ```
2. Lovable should auto-deploy from your connected repository

---

## Step 5: Verify Deployment

### Test Price Management
1. Login as admin user
2. Navigate to `/admin`
3. You should see 3 sections:
   - **Admin Analytics** (existing)
   - **Pricing Management** (new - with 3 tier cards)
   - **Prize Management** (enhanced - with delivery content)

### Test Pricing Updates
1. In admin panel, click "Edit" on Basic tier
2. Change price from $15 to $20
3. Update Stripe Price ID (create in Stripe first!)
4. Add reason: "Testing price management"
5. Save and verify success toast
6. Check frontend homepage - should show $20

### Test Prize Management
1. In admin panel, scroll to "Prize Management"
2. You should see a content count: "X of Y prizes have delivery content"
3. Each prize should show a green checkmark (✓) or orange warning (⚠️)
4. Click "Edit" on any prize
5. You should see:
   - Prize Name
   - Emoji
   - Prize Type dropdown
   - **Delivery Content textarea** (new!)
   - Weights for each tier
   - Active toggle
6. Add a video link like: `https://youtu.be/example`
7. Save and verify green checkmark appears

### Test Dynamic Pricing on Frontend
1. Logout from admin
2. Go to homepage
3. Verify pricing cards show updated prices (not $15/$30/$50)
4. Click "Spin Now" on any tier
5. Complete payment flow
6. Verify correct Stripe checkout price

---

## Step 6: Add Delivery Content to Prizes

Now that deployment is complete, you need to add delivery content (video links, images, etc.) to your prizes:

### How to Add Content:
1. Login to admin panel
2. Go to "Prize Management" section
3. For each prize:
   - Click "Edit"
   - Scroll to "Delivery Content"
   - Enter your content based on prize type:

**For Digital Link (Video/Image):**
```
https://youtu.be/abc123
https://drive.google.com/file/d/xxxxx/view
https://www.dropbox.com/s/xxxxx/video.mp4
```

**For Discount Code:**
```
DISCOUNT50OFF
VIP2024EXCLUSIVE
```

**For Text Message:**
```
Congratulations! You won exclusive access to my private content.
Check your email for the secret link. Enjoy! 💋
```

4. Click "Save Changes"
5. Verify green checkmark (✓) appears next to the prize name

### Check Content Count:
After adding content to all prizes, the counter at the top should show:
```
✓ 8 of 8 prizes have delivery content
```

---

## Step 7: Create Admin User (If Needed)

If you haven't created an admin user yet:

### Via SQL Editor:
```sql
-- First, sign up a user in your app (normal signup flow)
-- Then find their user_id and run this:

INSERT INTO user_roles (user_id, app_role)
VALUES ('YOUR_USER_ID_HERE', 'admin');
```

### Find Your User ID:
```sql
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 10;
```

---

## 🎯 What You Can Now Do

### As Admin:
✅ Change tier prices from the UI (no code changes needed)
✅ Update Stripe Price IDs
✅ View audit trail of all price changes
✅ Create new prizes with delivery content
✅ Edit prize names, emojis, types
✅ Add/edit video links, image links, discount codes
✅ Adjust probability weights per tier
✅ Toggle prizes active/inactive
✅ Delete prizes
✅ See content count (how many prizes have delivery configured)

### As User:
✅ See dynamic prices (no more hardcoded $15/$30/$50)
✅ Spin wheel and win prizes
✅ Receive delivery content (video links, codes, messages)

---

## 📋 Post-Deployment Checklist

- [ ] Database migration applied successfully
- [ ] 4 edge functions deployed (get-pricing, update-pricing, spin-with-wallet, create-checkout)
- [ ] Environment variables configured
- [ ] Frontend built and deployed
- [ ] Admin panel accessible at `/admin`
- [ ] Pricing Management section visible
- [ ] Enhanced Prize Management visible with content field
- [ ] Content count displaying correctly
- [ ] Can edit tier prices
- [ ] Can edit prize delivery content
- [ ] Frontend shows dynamic prices
- [ ] All existing prizes have delivery content added
- [ ] Test spin and prize delivery works

---

## 🐛 Troubleshooting

### "Failed to load pricing"
- Check that `get-pricing` edge function is deployed
- Verify database migration ran (pricing_config table exists)
- Check Supabase logs for errors

### "Admin access required" error
- Verify your user has admin role in `user_roles` table
- Check RLS policies are applied correctly
- Make sure you're logged in

### Can't see Delivery Content field
- Clear browser cache and hard refresh (Cmd+Shift+R)
- Verify EnhancedPrizeManagement component is deployed
- Check browser console for JavaScript errors

### Prices still showing $15/$30/$50
- Hard refresh browser
- Check `pricing_config` table has correct values
- Verify `get-pricing` API returns correct data
- Check browser network tab for API responses

---

## 🔐 Security Notes

### Important:
- Webhook credentials are now in environment variables (better, but still exposed in frontend)
- **Recommended Next Step**: Move webhook calls to a backend edge function for true security
- Never commit `.env` file to git (already added to `.gitignore`)
- Rotate webhook credentials regularly
- Monitor admin actions via `pricing_history` table

---

## 📊 Monitoring

### Check Pricing Changes:
```sql
SELECT * FROM pricing_history ORDER BY created_at DESC LIMIT 10;
```

### Check Admin Actions:
```sql
SELECT
  h.*,
  u.email as admin_email
FROM pricing_history h
LEFT JOIN auth.users u ON h.changed_by = u.id
ORDER BY h.created_at DESC;
```

### Check Prize Delivery Content:
```sql
SELECT
  pm.name,
  pm.emoji,
  pm.active,
  CASE
    WHEN pd.delivery_content IS NOT NULL AND pd.delivery_content != ''
    THEN '✓ Has content'
    ELSE '⚠ Missing content'
  END as content_status
FROM prize_metadata pm
LEFT JOIN prize_delivery pd ON pm.id = pd.prize_id
ORDER BY pm.created_at DESC;
```

---

## 🎉 You're All Set!

Your admin panel now has full price management and enhanced prize management with delivery content!

**Need Help?**
- Check `FIXES_APPLIED.md` for detailed technical documentation
- Review error logs in Supabase Dashboard → Logs
- Check browser console for frontend errors

---

**Last Updated:** November 13, 2024
**Version:** 1.0.0

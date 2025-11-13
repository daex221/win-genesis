# SendGrid Email Integration - Deployment Guide

## What Was Built

I've integrated **SendGrid email delivery** for sending mystery videos and prizes to users automatically when they win.

### New Files Created:
1. `supabase/functions/send-prize-email/index.ts` - SendGrid email function
2. Updated `supabase/functions/spin-with-wallet/index.ts` - Sends email after wallet spin
3. Updated `supabase/functions/spin-prize/index.ts` - Sends email after paid spin
4. Updated `src/components/SpinWheelAuth.tsx` - Passes delivery_content to webhook (if you still use n8n)

---

## Deployment Steps

### Step 1: Set SendGrid Environment Variables in Supabase

1. Go to: https://app.supabase.com/project/rhmnvdxlobctihspbtwr/settings/functions
2. Click "Add new secret"
3. Add these two secrets:

```
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@supporterswin.com
```

**How to get SendGrid API Key:**
- Go to: https://app.sendgrid.com/settings/api_keys
- Create a new API Key with "Full Access" permission
- Copy the key immediately (you won't see it again)

**From Email:**
- Use an email you've verified in SendGrid
- Go to: https://app.sendgrid.com/settings/sender_auth
- Verify your domain or single sender email

### Step 2: Deploy Database Migration

**Option A: Via Supabase SQL Editor**
1. Go to: https://app.supabase.com/project/rhmnvdxlobctihspbtwr/sql/new
2. Copy the entire contents of: `supabase/migrations/20251113200000_add_tier_specific_delivery.sql`
3. Paste and click "Run"

**Option B: Via CLI (if you have access token)**
```bash
cd /Users/user/win-genesis
export SUPABASE_ACCESS_TOKEN="your-token-from-https://app.supabase.com/account/tokens"
npx supabase db push
```

### Step 3: Deploy Edge Functions

```bash
cd /Users/user/win-genesis

# Deploy new email function
npx supabase functions deploy send-prize-email

# Redeploy updated spin functions
npx supabase functions deploy spin-prize
npx supabase functions deploy spin-with-wallet
```

**If you get auth errors, login first:**
```bash
# Get token from: https://app.supabase.com/account/tokens
npx supabase login --token YOUR_TOKEN
```

### Step 4: Deploy Frontend

```bash
npm run build
# Then deploy to Vercel/Netlify/your hosting platform
```

---

## How It Works

### Email Flow:

1. **User Spins and Wins**
   - User pays (Stripe) or uses wallet
   - Backend selects prize based on tier weights
   - Backend fetches tier-specific delivery_content

2. **Email Sent via SendGrid**
   - Backend calls `send-prize-email` function
   - Function sends beautiful HTML email with:
     - Prize name and emoji
     - Tier-specific video link or content
     - Custom styling based on content type

3. **User Receives Email**
   - Email arrives in inbox
   - Contains clickable video link
   - Styled professionally with their tier badge

### Email Templates:

#### For Mystery Videos (digital_link):
- Subject: 🎉 Your VIP Mystery Video is Here!
- Contains: Styled HTML with video link button
- Footer: Tier badge and instructions

#### For Discount Codes (code):
- Subject: 🎉 Your VIP Discount Code!
- Contains: Large styled code box
- Easy to copy and use

#### For Messages (message):
- Subject: 🎉 Prize Won: [Prize Name]
- Contains: Custom message content
- Professional branding

---

## Testing

### Test 1: Send Test Email Manually

Go to Supabase SQL Editor and run:

```sql
-- Replace with actual prize data from your database
SELECT * FROM prize_delivery WHERE is_tier_specific = true LIMIT 1;
```

Then use the Supabase Functions test feature:
1. Go to: https://app.supabase.com/project/rhmnvdxlobctihspbtwr/functions/send-prize-email
2. Click "Test"
3. Use this payload:

```json
{
  "email": "dimejicole21@gmail.com",
  "prizeData": {
    "name": "Mystery Video",
    "emoji": "🎥",
    "delivery_content": "https://youtu.be/YOUR_VIDEO_ID",
    "type": "digital_link"
  },
  "tier": "vip"
}
```

### Test 2: Full Integration Test

1. Add some wallet balance to your test account
2. Spin the wheel for a specific tier
3. Win a mystery video prize
4. Check dimejicole21@gmail.com inbox for email

### Test 3: Check SendGrid Dashboard

- Go to: https://app.sendgrid.com/statistics
- View delivery stats
- Check for bounces or failures

---

## Troubleshooting

### "Email service not configured" error
- **Solution**: Add `SENDGRID_API_KEY` to Supabase secrets
- Verify at: https://app.supabase.com/project/rhmnvdxlobctihspbtwr/settings/functions

### "SendGrid API error: 401"
- **Solution**: Your API key is invalid or expired
- Generate new key: https://app.sendgrid.com/settings/api_keys
- Update Supabase secret

### "SendGrid API error: 403"
- **Solution**: Your from email is not verified
- Verify sender: https://app.sendgrid.com/settings/sender_auth

### Emails not arriving
1. Check SendGrid Activity Feed: https://app.sendgrid.com/email_activity
2. Check spam folder
3. Verify email address is correct
4. Check Supabase function logs: `npx supabase functions logs send-prize-email`

### "Failed to send prize email" in logs
- Check that `SUPABASE_URL` is set correctly
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set
- Email failure doesn't prevent spin from completing (by design)

---

## Email Customization

To customize email templates, edit:
- File: `supabase/functions/send-prize-email/index.ts`
- Search for `emailHtml` variables
- Modify HTML/CSS as needed
- Redeploy: `npx supabase functions deploy send-prize-email`

### Brand Colors:
- Primary: `#667eea` (purple)
- Secondary: `#764ba2` (darker purple)
- Accent: Gradient `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

---

## SendGrid Best Practices

### 1. Warm Up Your Domain
- Start with low volume (10-20 emails/day)
- Gradually increase over 2-3 weeks
- Maintains good sender reputation

### 2. Monitor Deliverability
- Keep bounce rate < 5%
- Keep spam report rate < 0.1%
- Monitor: https://app.sendgrid.com/statistics

### 3. Use Authenticated Domain
- Set up domain authentication
- Improves deliverability by 20-30%
- Guide: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication

### 4. Handle Bounces
- Monitor bounce webhooks
- Remove invalid emails from your system
- Prevents being flagged as spammer

---

## Cost Estimate

**SendGrid Free Tier:**
- 100 emails/day forever free
- Perfect for testing

**SendGrid Essentials ($15-19/month):**
- 40,000-100,000 emails/month
- Good for small to medium traffic

**Your Expected Volume:**
- If 100 users spin daily = 100 emails/day
- Free tier is sufficient
- Upgrade when you hit 3,000+ spins/month

---

## Files Summary

### Created:
- `supabase/functions/send-prize-email/index.ts` (NEW)
- `SENDGRID_DEPLOYMENT.md` (this file)

### Modified:
- `supabase/functions/spin-prize/index.ts` - Added email sending
- `supabase/functions/spin-with-wallet/index.ts` - Added email sending
- `src/components/SpinWheelAuth.tsx` - Added delivery_content to webhook

---

## Quick Deploy Checklist

- [ ] Step 1: Add SendGrid secrets to Supabase
- [ ] Step 2: Deploy database migration (SQL editor)
- [ ] Step 3: Deploy `send-prize-email` function
- [ ] Step 4: Deploy `spin-prize` function
- [ ] Step 5: Deploy `spin-with-wallet` function
- [ ] Step 6: Deploy frontend (npm run build)
- [ ] Test: Send test email to dimejicole21@gmail.com
- [ ] Test: Do a full spin and check email delivery
- [ ] Monitor: Check SendGrid dashboard for delivery stats

---

**Ready to Deploy!** 🚀

Once deployed, every user who wins will automatically receive a beautiful email with their tier-specific mystery video or prize content.

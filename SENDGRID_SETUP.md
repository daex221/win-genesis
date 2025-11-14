# SendGrid Setup Instructions

## Environment Variables Setup

You need to set the following environment variables in your Supabase project:

### 1. Navigate to Supabase Dashboard
Go to: https://supabase.com/dashboard/project/rhmnvdxlobctihspbtwr/settings/functions

### 2. Set the following secrets:

```bash
SENDGRID_API_KEY=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
SENDGRID_FROM_EMAIL=exclusive@supporterswin.com
```

### 3. Steps in Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions**
2. Scroll to **Secrets** section
3. Click **Add new secret**
4. Add `SENDGRID_API_KEY` with the value above
5. Click **Add new secret** again
6. Add `SENDGRID_FROM_EMAIL` with the value above
7. Click **Save**

### 4. Deploy the Edge Function
After setting the secrets, you need to redeploy the `send-prize-email` function:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref rhmnvdxlobctihspbtwr

# Deploy the function
supabase functions deploy send-prize-email
```

## What Changed

### ✅ Removed
- All n8n webhook functionality
- `VITE_WEBHOOK_USERNAME` and `VITE_WEBHOOK_PASSWORD` from .env

### ✅ Added
- SendGrid email integration via Supabase Edge Function
- `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` configuration
- Email templates with tier-specific content

### ✅ Updated Files
- `src/components/SpinWheelAuth.tsx` - Replaced webhook with email function
- `supabase/functions/send-prize-email/index.ts` - Updated payload structure
- `.env` - Removed webhook credentials, added SendGrid config

## Testing
Once deployed, test by:
1. Running the dev server: `npm run dev`
2. Logging in and spinning the wheel
3. Check your email for the prize notification

## Troubleshooting
If emails don't send:
- Verify the SendGrid API key is active
- Check that `exclusive@supporterswin.com` is verified in SendGrid
- View Edge Function logs in Supabase Dashboard
- Check browser console for errors

# Implementation Instructions for Lovable AI

## Overview
Implement tier-specific mystery video content and SendGrid email integration for the Supporterswin prize wheel system.

---

## Feature 1: Tier-Specific Mystery Videos

### Problem
Currently, all users (Basic, Gold, VIP) receive the same mystery video content when they win. We need different content for each tier to increase perceived value.

### Solution
Add tier-specific delivery content columns to the database and update the admin panel to allow uploading different videos per tier.

---

## Database Changes Required

### Migration 1: Add tier-specific columns to prize_delivery table

Create a new migration file: `supabase/migrations/[timestamp]_add_tier_specific_delivery.sql`

```sql
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
```

---

## Feature 2: SendGrid Email Integration

### Problem
Need to automatically send mystery video links to users via email when they win prizes.

### Solution
Create a new Supabase Edge Function that uses SendGrid API to send beautiful HTML emails.

---

## Backend Changes Required

### 1. Create SendGrid Email Function

Create file: `supabase/functions/send-prize-email/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  prizeData: {
    name: string;
    emoji: string;
    delivery_content: string;
    type: string;
  };
  tier: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, prizeData, tier }: EmailRequest = await req.json();

    console.log(`[SEND-PRIZE-EMAIL] Sending ${prizeData.name} to ${email} (${tier} tier)`);

    if (!email || !prizeData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@supporterswin.com";

    if (!SENDGRID_API_KEY) {
      console.error("[SEND-PRIZE-EMAIL] SendGrid API key not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email HTML for mystery video
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .prize-box {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          .video-link {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .emoji { font-size: 48px; }
          .tier-badge {
            display: inline-block;
            background: #7B2CBF;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">${prizeData.emoji}</div>
            <h1>🎉 Congratulations!</h1>
            <p style="font-size: 20px; margin: 10px 0;">You Won: ${prizeData.name}</p>
            <span class="tier-badge">${tier.toUpperCase()} Tier</span>
          </div>
          <div class="content">
            <div class="prize-box">
              <h2 style="color: #667eea; margin-top: 0;">🎁 Your Exclusive Content:</h2>
              <p>As a <strong>${tier.toUpperCase()} tier</strong> member, here's your exclusive mystery video:</p>
              <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace;">
                <strong>${prizeData.delivery_content}</strong>
              </p>
              <center>
                <a href="${prizeData.delivery_content}" class="video-link">🎥 Watch Your Video Now</a>
              </center>
            </div>
            <p><strong>📌 Important:</strong></p>
            <ul>
              <li>This link is exclusive to you as a ${tier.toUpperCase()} member</li>
              <li>Save this email for future access</li>
              <li>Enjoy your premium ${tier} tier content!</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Congratulations! ${prizeData.emoji}

You Won: ${prizeData.name}
Tier: ${tier.toUpperCase()}

Your Exclusive ${tier.toUpperCase()} Content:
${prizeData.delivery_content}

Watch your video here: ${prizeData.delivery_content}

Important:
- This link is exclusive to you as a ${tier.toUpperCase()} member
- Save this email for future access
- Enjoy your premium ${tier} tier content!

Thank you for being a ${tier.toUpperCase()} supporter!

© ${new Date().getFullYear()} Supporterswin. All rights reserved.
    `.trim();

    // Send email via SendGrid
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
            subject: `🎉 Your ${tier.toUpperCase()} Mystery Video is Here!`,
          },
        ],
        from: {
          email: FROM_EMAIL,
          name: "Supporterswin",
        },
        content: [
          {
            type: "text/plain",
            value: emailText,
          },
          {
            type: "text/html",
            value: emailHtml,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SEND-PRIZE-EMAIL] SendGrid error:", errorText);
      throw new Error(`SendGrid API error: ${response.status}`);
    }

    console.log("[SEND-PRIZE-EMAIL] Email sent successfully to", email);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEND-PRIZE-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 2. Update spin-with-wallet function

In `supabase/functions/spin-with-wallet/index.ts`, find where the prize is selected and add this code AFTER fetching delivery content:

```typescript
// Fetch delivery content for the selected prize (using service role)
const { data: deliveryData, error: deliveryError } = await supabaseClient
  .from("prize_delivery")
  .select("is_tier_specific, delivery_content_basic, delivery_content_gold, delivery_content_vip, delivery_content_legacy")
  .eq("prize_id", selectedPrize.id)
  .single();

if (deliveryError) {
  console.error("[SPIN-WITH-WALLET] Error fetching delivery content:", deliveryError);
  return new Response(
    JSON.stringify({ error: "Failed to retrieve prize details" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Determine the appropriate content based on tier
let deliveryContent: string;

if (deliveryData.is_tier_specific) {
  // Use tier-specific content
  switch (tier) {
    case "basic":
      deliveryContent = deliveryData.delivery_content_basic;
      break;
    case "gold":
      deliveryContent = deliveryData.delivery_content_gold;
      break;
    case "vip":
      deliveryContent = deliveryData.delivery_content_vip;
      break;
    default:
      deliveryContent = deliveryData.delivery_content_basic;
  }
  console.log(`[SPIN-WITH-WALLET] Using tier-specific content for ${tier} tier`);
} else {
  // Use shared content (backward compatibility)
  deliveryContent = deliveryData.delivery_content_basic || deliveryData.delivery_content_legacy;
  console.log("[SPIN-WITH-WALLET] Using shared content for all tiers");
}
```

Then, BEFORE returning the response, add email sending:

```typescript
// Send prize email via SendGrid
try {
  const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-prize-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      email: user.email,
      prizeData: {
        name: selectedPrize.name,
        emoji: selectedPrize.emoji,
        delivery_content: deliveryContent,
        type: selectedPrize.type,
      },
      tier,
    }),
  });

  if (emailResponse.ok) {
    console.log("[SPIN-WITH-WALLET] Prize email sent to", user.email);
  } else {
    console.error("[SPIN-WITH-WALLET] Failed to send prize email:", await emailResponse.text());
  }
} catch (emailError) {
  console.error("[SPIN-WITH-WALLET] Error sending prize email:", emailError);
  // Don't fail the spin if email fails
}

// Return response with deliveryContent instead of old delivery_content
return new Response(
  JSON.stringify({
    prize: {
      id: selectedPrize.id,
      name: selectedPrize.name,
      emoji: selectedPrize.emoji,
      type: selectedPrize.type,
      delivery_content: deliveryContent,
    },
    newBalance: newBalance,
  }),
  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

### 3. Update spin-prize function

Apply the SAME changes as above to `supabase/functions/spin-prize/index.ts` (replace user.email with transaction.email).

---

## Frontend Changes Required

### Update EnhancedPrizeManagement Component

In `src/components/EnhancedPrizeManagement.tsx`:

1. **Update the interface:**

```typescript
interface EditingPrize {
  id?: string;
  name: string;
  emoji: string;
  type: string;
  weight_basic: string;
  weight_gold: string;
  weight_vip: string;
  active: boolean;
  is_tier_specific: boolean;  // ADD THIS
  delivery_content: string;
  delivery_content_basic: string;  // ADD THIS
  delivery_content_gold: string;   // ADD THIS
  delivery_content_vip: string;    // ADD THIS
}
```

2. **Update handleEditClick to fetch tier-specific fields:**

```typescript
const { data: deliveryData, error } = await supabase
  .from("prize_delivery")
  .select("is_tier_specific, delivery_content_basic, delivery_content_gold, delivery_content_vip")
  .eq("prize_id", prize.id)
  .maybeSingle();

const isTierSpecific = deliveryData?.is_tier_specific || false;

setEditingPrize({
  id: prize.id,
  name: prize.name,
  emoji: prize.emoji,
  type: prize.type,
  weight_basic: prize.weight_basic.toString(),
  weight_gold: prize.weight_gold.toString(),
  weight_vip: prize.weight_vip.toString(),
  active: prize.active,
  is_tier_specific: isTierSpecific,
  delivery_content: isTierSpecific ? "" : (deliveryData?.delivery_content_basic || ""),
  delivery_content_basic: deliveryData?.delivery_content_basic || "",
  delivery_content_gold: deliveryData?.delivery_content_gold || "",
  delivery_content_vip: deliveryData?.delivery_content_vip || "",
});
```

3. **Update handleNewPrize:**

```typescript
const handleNewPrize = () => {
  setEditingPrize({
    name: "",
    emoji: "🎁",
    type: "digital_link",
    weight_basic: "10",
    weight_gold: "10",
    weight_vip: "10",
    active: true,
    is_tier_specific: false,  // ADD THIS
    delivery_content: "",
    delivery_content_basic: "",  // ADD THIS
    delivery_content_gold: "",   // ADD THIS
    delivery_content_vip: "",    // ADD THIS
  });
  setIsNewPrize(true);
  setDialogOpen(true);
};
```

4. **Update validation in handleSavePrize:**

```typescript
// Validate delivery content based on mode
if (editingPrize.is_tier_specific) {
  if (!editingPrize.delivery_content_basic.trim() ||
      !editingPrize.delivery_content_gold.trim() ||
      !editingPrize.delivery_content_vip.trim()) {
    toast.error("All tier-specific delivery content is required (Basic, Gold, and VIP)");
    return;
  }
} else {
  if (!editingPrize.delivery_content.trim()) {
    toast.error("Delivery content is required (video link, image link, or message)");
    return;
  }
}
```

5. **Update save logic:**

```typescript
// When saving (both insert and update):
const deliveryData = editingPrize.is_tier_specific
  ? {
      prize_id: prizeId,  // newMetadata.id for insert, editingPrize.id for update
      is_tier_specific: true,
      delivery_content_basic: editingPrize.delivery_content_basic,
      delivery_content_gold: editingPrize.delivery_content_gold,
      delivery_content_vip: editingPrize.delivery_content_vip,
      delivery_content_legacy: editingPrize.delivery_content_basic, // Fallback
    }
  : {
      prize_id: prizeId,
      is_tier_specific: false,
      delivery_content_basic: editingPrize.delivery_content,
      delivery_content_gold: editingPrize.delivery_content,
      delivery_content_vip: editingPrize.delivery_content,
      delivery_content_legacy: editingPrize.delivery_content,
    };
```

6. **Add UI in the dialog (after the Prize Type field):**

```tsx
{/* Tier-Specific Content Toggle */}
<div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg border border-border">
  <input
    type="checkbox"
    id="is_tier_specific"
    checked={editingPrize.is_tier_specific}
    onChange={(e) =>
      setEditingPrize({ ...editingPrize, is_tier_specific: e.target.checked })
    }
    className="w-4 h-4"
  />
  <label htmlFor="is_tier_specific" className="text-sm text-foreground cursor-pointer">
    <span className="font-semibold">Use tier-specific content</span>
    <span className="block text-xs text-muted-foreground mt-1">
      Enable this to set different mystery videos/content for each tier (Basic, Gold, VIP)
    </span>
  </label>
</div>

{/* Delivery Content Fields */}
{editingPrize.is_tier_specific ? (
  // Show tier-specific fields
  <div className="space-y-4">
    <div className="text-sm font-medium text-foreground">
      Tier-Specific Delivery Content *
    </div>

    {/* Basic Tier Content */}
    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
      <label className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 block">
        Basic Tier Content (Video/Image Link)
      </label>
      <Textarea
        value={editingPrize.delivery_content_basic}
        onChange={(e) =>
          setEditingPrize({ ...editingPrize, delivery_content_basic: e.target.value })
        }
        placeholder="https://youtu.be/BASIC_VIDEO"
        className="bg-background border-border text-foreground font-mono text-sm min-h-[100px]"
        rows={4}
      />
    </div>

    {/* Gold Tier Content */}
    <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
      <label className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2 block">
        Gold Tier Content (Video/Image Link)
      </label>
      <Textarea
        value={editingPrize.delivery_content_gold}
        onChange={(e) =>
          setEditingPrize({ ...editingPrize, delivery_content_gold: e.target.value })
        }
        placeholder="https://youtu.be/GOLD_VIDEO"
        className="bg-background border-border text-foreground font-mono text-sm min-h-[100px]"
        rows={4}
      />
    </div>

    {/* VIP Tier Content */}
    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
      <label className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 block">
        VIP Tier Content (Video/Image Link)
      </label>
      <Textarea
        value={editingPrize.delivery_content_vip}
        onChange={(e) =>
          setEditingPrize({ ...editingPrize, delivery_content_vip: e.target.value })
        }
        placeholder="https://youtu.be/VIP_EXCLUSIVE"
        className="bg-background border-border text-foreground font-mono text-sm min-h-[100px]"
        rows={4}
      />
    </div>

    <div className="text-xs text-muted-foreground bg-blue-500/10 p-3 rounded border border-blue-500/30">
      <p>💡 Set different videos for each tier to reward higher-tier users</p>
      <p>Example: Basic = Teaser, Gold = Full video, VIP = Extended cut + bonus</p>
    </div>
  </div>
) : (
  // Show single shared content field
  <div>
    <label className="text-sm font-medium text-foreground mb-2 block">
      Delivery Content (Shared for all tiers) *
    </label>
    <Textarea
      value={editingPrize.delivery_content}
      onChange={(e) =>
        setEditingPrize({ ...editingPrize, delivery_content: e.target.value })
      }
      placeholder="https://youtu.be/VIDEO_LINK"
      className="bg-background border-border text-foreground font-mono text-sm min-h-[120px]"
      rows={6}
    />
  </div>
)}
```

---

## Configuration Required

### Supabase Environment Variables

Add these secrets in Supabase Dashboard → Settings → Edge Functions:

```
SENDGRID_API_KEY=YOUR_SENDGRID_API_KEY_HERE
SENDGRID_FROM_EMAIL=noreply@supporterswin.com
```

**How to get SendGrid API Key:**
1. Go to https://app.sendgrid.com/settings/api_keys
2. Create new API key with "Full Access" or "Mail Send" permission
3. Copy the key (starts with `SG.`)

**Verify Sender Email:**
1. Go to https://app.sendgrid.com/settings/sender_auth
2. Click "Create New Sender" or "Authenticate Your Domain"
3. Verify the email address you'll use

---

## Deployment Steps

### 1. Deploy Database Migration

```bash
# In Supabase SQL Editor, run the migration SQL above
# OR via CLI:
npx supabase db push
```

### 2. Deploy Edge Functions

```bash
npx supabase functions deploy send-prize-email
npx supabase functions deploy spin-prize
npx supabase functions deploy spin-with-wallet
```

### 3. Add Environment Variables

In Supabase Dashboard → Settings → Edge Functions, add:
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

---

## Testing Instructions

### Test 1: Admin Panel

1. Login as admin at `/admin`
2. Find "Prize Management" section
3. Click "Edit" on any prize
4. Enable "Use tier-specific content" checkbox
5. Enter different video URLs for Basic, Gold, VIP
6. Save and verify data in database

### Test 2: Email Delivery

1. Create test user account
2. Add wallet balance
3. Spin wheel for a specific tier (e.g., VIP)
4. Win a mystery video prize
5. Check email inbox for tier-appropriate video link
6. Verify email has correct tier badge and content

### Test 3: All Tiers

1. Test with Basic tier - should get Basic video
2. Test with Gold tier - should get Gold video
3. Test with VIP tier - should get VIP video
4. Verify each email has correct tier badge and different content

---

## Expected Behavior After Implementation

### For Admin:
- ✅ Toggle to enable tier-specific content per prize
- ✅ 3 separate fields for Basic/Gold/VIP content
- ✅ Color-coded UI (Green/Yellow/Purple)
- ✅ Validation ensures all 3 tiers have content when enabled

### For Users:
- ✅ Spin and win prizes as normal
- ✅ Automatically receive email within seconds
- ✅ Email contains their tier-specific video link
- ✅ Beautiful HTML email with tier badge
- ✅ VIP users get different content than Basic users

### Technical:
- ✅ Backward compatible with existing prizes
- ✅ Non-blocking (spin completes even if email fails)
- ✅ Logged for debugging
- ✅ Database-driven (no code changes needed to update content)

---

## Troubleshooting

### "Email service not configured" error
- Add `SENDGRID_API_KEY` to Supabase secrets

### "Sender not verified" error
- Verify sender email in SendGrid dashboard

### Emails going to spam
- Authenticate your domain in SendGrid
- Mark as "Not Spam" initially

### No email received
- Check SendGrid Activity: https://app.sendgrid.com/email_activity
- Check Supabase function logs
- Verify user's email is correct

---

## Summary

This implementation adds:
1. **Database columns** for tier-specific content (basic/gold/vip)
2. **SendGrid integration** for automatic email delivery
3. **Admin UI** with toggle and 3 text areas per prize
4. **Backend logic** to select and deliver correct content per tier
5. **Beautiful HTML emails** with tier badges and video links

**Result:** VIP users get exclusive content different from Basic/Gold users, delivered automatically via email when they win!

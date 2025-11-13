#!/bin/bash

# Test SendGrid Email Integration
# This script sends a test email to verify SendGrid is working

echo "🧪 Testing SendGrid Email Integration..."
echo ""

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL not set. Using default from .env..."
  export SUPABASE_URL="https://rhmnvdxlobctihspbtwr.supabase.co"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not set."
  echo "Please set it manually or get it from:"
  echo "https://app.supabase.com/project/rhmnvdxlobctihspbtwr/settings/api"
  echo ""
  read -p "Enter your Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
  export SUPABASE_SERVICE_ROLE_KEY
fi

# Test payload with mystery video
TEST_PAYLOAD='{
  "email": "dimejicole21@gmail.com",
  "prizeData": {
    "name": "Mystery Video - VIP Exclusive",
    "emoji": "🎥",
    "delivery_content": "https://youtu.be/dQw4w9WgXcQ",
    "type": "digital_link"
  },
  "tier": "vip"
}'

echo "📧 Sending test email to: dimejicole21@gmail.com"
echo "🎥 Prize: VIP Mystery Video"
echo ""

# Call the send-prize-email function
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/send-prize-email" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "success"; then
  echo "✅ SUCCESS! Email sent successfully!"
  echo "📬 Check dimejicole21@gmail.com inbox (and spam folder)"
  echo ""
  echo "💡 Tip: Check SendGrid dashboard for delivery status:"
  echo "   https://app.sendgrid.com/email_activity"
else
  echo "❌ FAILED! Something went wrong."
  echo ""
  echo "Common issues:"
  echo "1. SendGrid API key not set in Supabase secrets"
  echo "2. From email not verified in SendGrid"
  echo "3. Edge function not deployed yet"
  echo ""
  echo "🔧 Troubleshooting:"
  echo "   1. Check Supabase secrets: https://app.supabase.com/project/rhmnvdxlobctihspbtwr/settings/functions"
  echo "   2. Deploy function: npx supabase functions deploy send-prize-email"
  echo "   3. Check logs: npx supabase functions logs send-prize-email"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Check email inbox"
echo "   2. Verify SendGrid dashboard"
echo "   3. Test full spin integration"

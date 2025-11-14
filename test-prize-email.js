#!/usr/bin/env node

/**
 * Test Script for SendGrid Prize Email
 * Sends a test mystery video email to verify the integration
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rhmnvdxlobctihspbtwr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobW52ZHhsb2JjdGloc3BidHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQwNjgsImV4cCI6MjA3ODA4MDA2OH0.seF1obsqDWsHhAo1uqlvChuo14hspUbKG-PSPaG5o88';

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendTestEmail() {
  console.log('🧪 Testing SendGrid Email Integration...\n');

  const testPayload = {
    email: 'dimejicole@gmail.com',
    prizeData: {
      name: 'Mystery Video Clip',
      emoji: '🎥',
      deliveryContent: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Sample video URL
      tier: 'vip',
      userName: 'Test Winner'
    }
  };

  console.log('📧 Sending test email with the following details:');
  console.log('   To:', testPayload.email);
  console.log('   Prize:', testPayload.prizeData.name, testPayload.prizeData.emoji);
  console.log('   Tier:', testPayload.prizeData.tier.toUpperCase());
  console.log('   Video URL:', testPayload.prizeData.deliveryContent);
  console.log('\n⏳ Invoking Supabase Edge Function...\n');

  try {
    const { data, error } = await supabase.functions.invoke('send-prize-email', {
      body: testPayload
    });

    if (error) {
      console.error('❌ Error invoking function:', error);
      console.error('\n💡 Possible issues:');
      console.error('   1. Edge Function not deployed yet');
      console.error('   2. SENDGRID_API_KEY not set in Supabase');
      console.error('   3. SENDGRID_FROM_EMAIL not set in Supabase');
      console.error('\n📝 Follow instructions in SENDGRID_SETUP.md');
      process.exit(1);
    }

    console.log('✅ Success! Email sent.');
    console.log('📬 Response:', data);
    console.log('\n✉️  Check dimejicole@gmail.com for the test email!');
    console.log('📁 Check spam folder if not in inbox.');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run the test
sendTestEmail();

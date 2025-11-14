#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrizes() {
  console.log('🔍 Checking prize content in database...\n');

  // Check prize_metadata
  const { data: metadata, error: metaError } = await supabase
    .from('prize_metadata')
    .select('*')
    .order('id');

  if (metaError) {
    console.error('Error fetching prize_metadata:', metaError);
  } else {
    console.log('📋 Prize Metadata:');
    metadata.forEach(prize => {
      console.log(`  - ${prize.emoji} ${prize.name} (ID: ${prize.id}, Active: ${prize.active})`);
    });
  }

  console.log('\n');

  // Check prize_delivery
  const { data: delivery, error: deliveryError } = await supabase
    .from('prize_delivery')
    .select('*')
    .order('prize_id');

  if (deliveryError) {
    console.error('Error fetching prize_delivery:', deliveryError);
  } else {
    console.log('🎁 Prize Delivery Content:');
    delivery.forEach(d => {
      console.log(`\n  Prize ID: ${d.prize_id}`);
      console.log(`  Type: ${d.delivery_type}`);
      console.log(`  Tier-specific: ${d.is_tier_specific || false}`);

      if (d.is_tier_specific) {
        console.log(`  Basic: ${d.delivery_content_basic || 'N/A'}`);
        console.log(`  Gold: ${d.delivery_content_gold || 'N/A'}`);
        console.log(`  VIP: ${d.delivery_content_vip || 'N/A'}`);
      } else {
        console.log(`  Content: ${d.delivery_content_legacy || d.delivery_content || 'N/A'}`);
      }
    });
  }
}

checkPrizes();

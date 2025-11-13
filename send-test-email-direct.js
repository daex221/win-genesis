#!/usr/bin/env node

/**
 * Direct SendGrid Test - Sends a mystery video email
 * Run: node send-test-email-direct.js
 */

const https = require('https');

// Configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'YOUR_SENDGRID_API_KEY_HERE';
const TO_EMAIL = 'dimejicole@gmail.com'; // Change if needed
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@supporterswin.com';

// Test data - Using a real mystery video
const testData = {
  prizeName: 'Mystery Video - VIP Exclusive 🎥',
  prizeEmoji: '🎥',
  videoLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  tier: 'vip'
};

// Email HTML Template
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
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
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
      <div class="emoji">${testData.prizeEmoji}</div>
      <h1>🎉 Congratulations!</h1>
      <p style="font-size: 20px; margin: 10px 0;">You Won: ${testData.prizeName}</p>
      <span class="tier-badge">${testData.tier.toUpperCase()} Tier</span>
    </div>
    <div class="content">
      <div class="prize-box">
        <h2 style="color: #667eea; margin-top: 0;">🎁 Your Exclusive Content:</h2>
        <p>As a <strong>${testData.tier.toUpperCase()} tier</strong> member, here's your exclusive mystery video:</p>
        <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace;">
          <strong>${testData.videoLink}</strong>
        </p>
        <center>
          <a href="${testData.videoLink}" class="video-link">🎥 Watch Your Video Now</a>
        </center>
      </div>
      <p><strong>📌 Important:</strong></p>
      <ul>
        <li>This link is exclusive to you as a ${testData.tier.toUpperCase()} member</li>
        <li>Save this email for future access</li>
        <li>Enjoy your premium ${testData.tier} tier content!</li>
        <li>Share your experience with other supporters!</li>
      </ul>
    </div>
    <div class="footer">
      <p style="font-size: 14px; color: #667eea; font-weight: bold;">
        Thank you for being a ${testData.tier.toUpperCase()} supporter! 💜
      </p>
      <p>&copy; ${new Date().getFullYear()} Supporterswin. All rights reserved.</p>
      <p style="font-size: 10px; margin-top: 20px;">
        This is a test email from your prize delivery system.
      </p>
    </div>
  </div>
</body>
</html>
`;

const emailText = `
🎉 Congratulations! ${testData.prizeEmoji}

You Won: ${testData.prizeName}
Tier: ${testData.tier.toUpperCase()}

Your Exclusive ${testData.tier.toUpperCase()} Content:
${testData.videoLink}

🎥 Watch your video here: ${testData.videoLink}

📌 Important:
- This link is exclusive to you as a ${testData.tier.toUpperCase()} member
- Save this email for future access
- Enjoy your premium ${testData.tier} tier content!
- Share your experience with other supporters!

Thank you for being a ${testData.tier.toUpperCase()} supporter! 💜

© ${new Date().getFullYear()} Supporterswin. All rights reserved.

This is a test email from your prize delivery system.
`.trim();

// SendGrid email payload
const emailPayload = JSON.stringify({
  personalizations: [
    {
      to: [{ email: TO_EMAIL }],
      subject: `🎉 Your ${testData.tier.toUpperCase()} Mystery Video is Here! [TEST]`,
    },
  ],
  from: {
    email: FROM_EMAIL,
    name: 'Supporterswin',
  },
  content: [
    {
      type: 'text/plain',
      value: emailText,
    },
    {
      type: 'text/html',
      value: emailHtml,
    },
  ],
});

// Send email via SendGrid API
function sendEmail() {
  if (SENDGRID_API_KEY === 'YOUR_SENDGRID_API_KEY_HERE') {
    console.log('❌ ERROR: Please set your SendGrid API key!');
    console.log('');
    console.log('Set it via environment variable:');
    console.log('  export SENDGRID_API_KEY="SG.your-key-here"');
    console.log('  node send-test-email-direct.js');
    console.log('');
    console.log('Or edit this file and replace YOUR_SENDGRID_API_KEY_HERE with your actual key');
    console.log('Get your key from: https://app.sendgrid.com/settings/api_keys');
    process.exit(1);
  }

  console.log('📧 Sending test mystery video email...');
  console.log(`   To: ${TO_EMAIL}`);
  console.log(`   From: ${FROM_EMAIL}`);
  console.log(`   Prize: ${testData.prizeName}`);
  console.log(`   Video: ${testData.videoLink}`);
  console.log(`   Tier: ${testData.tier.toUpperCase()}`);
  console.log('');

  const options = {
    hostname: 'api.sendgrid.com',
    port: 443,
    path: '/v3/mail/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(emailPayload),
    },
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 202) {
        console.log('✅ SUCCESS! Email sent successfully!');
        console.log('');
        console.log('📬 Check your inbox at: ' + TO_EMAIL);
        console.log('   (Don\'t forget to check spam folder!)');
        console.log('');
        console.log('💡 Verify delivery in SendGrid dashboard:');
        console.log('   https://app.sendgrid.com/email_activity');
        console.log('');
        console.log('🎥 The test email contains this video link:');
        console.log('   ' + testData.videoLink);
      } else {
        console.log(`❌ FAILED! Status code: ${res.statusCode}`);
        console.log('Response:', data);
        console.log('');
        console.log('Common issues:');
        console.log('1. Invalid API key - Check: https://app.sendgrid.com/settings/api_keys');
        console.log('2. From email not verified - Check: https://app.sendgrid.com/settings/sender_auth');
        console.log('3. Account suspended or limited');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error sending email:', error.message);
  });

  req.write(emailPayload);
  req.end();
}

// Run the test
sendEmail();

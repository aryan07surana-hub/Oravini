import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

async function testEmailConfig() {
  console.log("\n🧪 Testing Email Configuration...\n");

  // Check if credentials are set
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error("❌ ERROR: EMAIL_USER or EMAIL_PASS not set in .env file");
    console.log("\nTo fix this:");
    console.log("1. Copy .env.example to .env");
    console.log("2. Set EMAIL_USER and EMAIL_PASS");
    console.log("3. For Gmail, use an App Password (see EMAIL_SETUP_GUIDE.md)");
    process.exit(1);
  }

  console.log("✓ Email credentials found in .env");
  console.log(`  EMAIL_USER: ${EMAIL_USER}`);
  console.log(`  EMAIL_PASS: ${EMAIL_PASS.substring(0, 4)}****\n`);

  // Create transporter
  const transporter = nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  console.log("📧 Sending test email...\n");

  try {
    const info = await transporter.sendMail({
      from: `"Oravini Scheduling Test" <${EMAIL_USER}>`,
      to: EMAIL_USER, // Send to yourself
      subject: "✓ Oravini Email Configuration Test",
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 24px; font-weight: 700; }
    .content { padding: 32px 24px; }
    .success-badge { background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .success-badge h2 { margin: 0 0 8px 0; color: #166534; font-size: 20px; }
    .success-badge p { margin: 0; color: #166534; font-size: 14px; }
    .info-box { background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .info-row { margin-bottom: 8px; color: #52525b; font-size: 14px; }
    .info-row strong { color: #18181b; }
    .footer { background: #18181b; padding: 24px; text-align: center; }
    .footer p { margin: 0; color: #a1a1aa; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Email Configuration Successful!</h1>
    </div>
    <div class="content">
      <div class="success-badge">
        <h2>🎉 It Works!</h2>
        <p>Your email configuration is working perfectly</p>
      </div>

      <div class="info-box">
        <h3 style="margin: 0 0 12px 0; color: #18181b;">Configuration Details</h3>
        <div class="info-row"><strong>From:</strong> ${EMAIL_USER}</div>
        <div class="info-row"><strong>Service:</strong> Gmail SMTP</div>
        <div class="info-row"><strong>Status:</strong> Connected ✓</div>
      </div>

      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">What's Next?</h4>
        <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.6;">
          Your scheduling system is ready to send:<br/>
          • Booking confirmations<br/>
          • 24-hour reminders<br/>
          • 1-hour reminders<br/>
          • Cancellation notifications
        </p>
      </div>
    </div>
    <div class="footer">
      <p>This is a test email from Oravini Scheduling System</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
✓ Email Configuration Successful!

Your email configuration is working perfectly.

Configuration Details:
- From: ${EMAIL_USER}
- Service: Gmail SMTP
- Status: Connected ✓

What's Next?
Your scheduling system is ready to send:
• Booking confirmations
• 24-hour reminders
• 1-hour reminders
• Cancellation notifications

This is a test email from Oravini Scheduling System
      `.trim(),
    });

    console.log("✅ SUCCESS! Test email sent successfully!\n");
    console.log("📬 Check your inbox:", EMAIL_USER);
    console.log(`   Message ID: ${info.messageId}\n`);
    console.log("🎉 Your email configuration is working perfectly!\n");
    console.log("Next steps:");
    console.log("1. Check your email inbox");
    console.log("2. Start your server: npm run dev");
    console.log("3. Create a test booking in the scheduling section");
    console.log("4. See the email implementation docs in:");
    console.log("   - EMAIL_SETUP_GUIDE.md");
    console.log("   - SCHEDULING_EMAIL_IMPLEMENTATION.md\n");
  } catch (error: any) {
    console.error("❌ ERROR: Failed to send test email\n");
    console.error("Error details:", error.message);
    console.log("\nCommon issues:");
    console.log("1. Wrong Gmail App Password");
    console.log("   → Go to https://myaccount.google.com/apppasswords");
    console.log("   → Generate a new 16-character password");
    console.log("   → Update EMAIL_PASS in .env");
    console.log("\n2. 2-Factor Authentication not enabled");
    console.log("   → Go to https://myaccount.google.com/security");
    console.log("   → Enable 2-Step Verification");
    console.log("   → Then create App Password");
    console.log("\n3. Less secure app access");
    console.log("   → Don't use this - use App Passwords instead");
    console.log("\nSee EMAIL_SETUP_GUIDE.md for detailed instructions\n");
    process.exit(1);
  }
}

testEmailConfig();

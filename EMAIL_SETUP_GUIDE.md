# Email Configuration for Scheduling (Calendly-style)

Your scheduling system now automatically sends emails just like Calendly! Here's what you need to set up:

## 📧 What Emails Are Sent

### 1. **Booking Confirmation** (Immediate)
- ✓ Sent instantly when a booking is created
- Includes meeting details, Google Meet link, and calendar info
- Beautiful HTML email with your branding

### 2. **24-Hour Reminder** (Automatic)
- ⏰ Sent 24 hours before the call
- Reminds the client about their upcoming meeting
- Includes meeting link for quick access

### 3. **1-Hour Reminder** (Automatic)
- 🔔 Sent 1 hour before the call
- Final reminder with "Join Now" button
- Creates urgency so they don't miss it

### 4. **Cancellation Email** (On Cancel)
- ✕ Sent when a booking is cancelled
- Includes option to reschedule
- Professional cancellation notification

## ⚙️ Setup Instructions

### Option 1: Gmail (Easiest)

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Update .env file**:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

### Option 2: Custom SMTP

Update your `.env` file with your SMTP server details:

```env
EMAIL_USER=support@yourdomain.com
EMAIL_PASS=your-password
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
```

### Option 3: SendGrid, Mailgun, etc.

```env
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
```

## 🚀 How It Works

### Booking Confirmation
When someone books a call (via your booking page or admin panel), they **immediately** receive a confirmation email with:
- Meeting details (date, time, duration)
- Google Meet link (if Google Calendar is connected)
- Calendar invite
- Reschedule/cancel options

### Automatic Reminders
The system runs background cron jobs that:
- **Check every hour** for bookings happening in 24 hours → sends reminder
- **Check every 10 minutes** for bookings happening in 1 hour → sends reminder
- **Cleans up daily** to remove old booking data from memory

### No Duplicate Emails
The system tracks which reminders have been sent to prevent duplicate emails.

## 📝 Testing

1. **Start the server**: `npm run dev`
2. **Create a test booking** in the scheduling section
3. **Check the console** for email logs:
   ```
   ✓ Booking confirmation sent to client@example.com
   ```

## 🎨 Email Customization

All email templates are in `/server/emailService.ts`. You can customize:
- Colors and branding
- Email copy and messaging
- Logo and header images
- Call-to-action buttons

## 🔍 Troubleshooting

### Emails not sending?
1. Check `.env` file has `EMAIL_USER` and `EMAIL_PASS` set
2. Verify Gmail App Password is correct (16 characters, no spaces)
3. Check server console for error messages
4. Test your SMTP credentials with a simple test script

### Wrong timezone?
- Emails use the user's browser timezone
- Adjust timezone in scheduling settings

### No Google Meet links?
- Connect Google Calendar in Settings
- Authorize with OAuth
- Meet links auto-generate for each booking

## 📊 Email Delivery Status

Check your server logs for:
```
✓ Booking confirmation sent to client@example.com
✓ Sent 24h reminder for booking 123
✓ Sent 1h reminder for booking 123
```

## 🎯 Production Deployment

For production, consider:
- **Transactional email service** (SendGrid, Postmark, Mailgun)
- **Higher sending limits** than Gmail
- **Better deliverability** with SPF/DKIM records
- **Email analytics** and tracking

## 💡 Tips

1. **Professional From Address**: Use support@yourdomain.com instead of personal Gmail
2. **Test First**: Send test bookings to yourself before going live
3. **Monitor Logs**: Check server logs to ensure emails are sending
4. **Backup Plan**: Have a manual reminder system as backup

---

## Example Email Flow

```
Client Books Call (3:00 PM, Jan 15)
    ↓
✓ Immediate: Confirmation Email
    ↓
⏰ 24 hours before: "Your call is tomorrow at 3 PM"
    ↓
🔔 1 hour before: "Your call starts in 1 hour - Join Now"
    ↓
📞 Call Time: Client joins via Meet link
```

---

Your scheduling system is now as professional as Calendly! 🎉

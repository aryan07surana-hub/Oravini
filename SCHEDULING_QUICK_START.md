# 📧 Scheduling Email System - Quick Start

## What's Been Done ✅

Your scheduling system now has **Calendly-style email automation**:

- ✓ Fixed booking page error (GoogleCalendarWidget added)
- ✓ Instant booking confirmation emails
- ✓ Automatic 24-hour reminder emails
- ✓ Automatic 1-hour reminder emails  
- ✓ Cancellation notification emails
- ✓ Beautiful HTML email templates
- ✓ Automatic cron jobs for reminders

## Setup in 3 Steps 🚀

### 1. Get Gmail App Password

```bash
# Go to: https://myaccount.google.com/apppasswords
# Select: Mail → Generate
# Copy: 16-character password (e.g., "abcd efgh ijkl mnop")
```

### 2. Update .env File

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcdefghijklmnop  # No spaces!
```

### 3. Test It

```bash
# Test email configuration
npm run test:email

# If successful, start server
npm run dev
```

## How It Works 🎯

```
Someone Books a Call
    ↓
✓ Instant Confirmation Email
    ↓
⏰ 24 Hours Before → Reminder Email
    ↓
🔔 1 Hour Before → Final Reminder
    ↓
📞 Call Time!
```

## Test Your Setup 🧪

**Option 1: Test Script**
```bash
npm run test:email
```

**Option 2: Create Real Booking**
1. Go to Scheduling section
2. Click "New Booking"
3. Fill in details
4. Check email inbox

## Check It's Working ✓

Look for these logs in your terminal:
```
✓ Booking confirmation sent to client@example.com
⏰ Running 24-hour reminder check...
✓ Sent 24h reminder for booking 123
```

## Troubleshooting 🔧

**No emails?**
- Check `.env` has EMAIL_USER and EMAIL_PASS
- Verify App Password (16 chars, no spaces)
- Run `npm run test:email` to diagnose

**Wrong password error?**
1. Enable 2FA: https://myaccount.google.com/security
2. Create new App Password: https://myaccount.google.com/apppasswords
3. Update .env with new password

## Email Schedule ⏰

| Event | When Sent | Frequency |
|-------|-----------|-----------|
| Confirmation | Immediate | Once |
| 24h Reminder | 24 hrs before | Once |
| 1h Reminder | 1 hr before | Once |
| Cancellation | On cancel | Once |

## Cron Jobs Running 🤖

```
✓ 24-hour check: Every hour
✓ 1-hour check: Every 10 minutes  
✓ Cleanup: Daily at 2 AM
```

## Next Steps 📚

1. ✅ Configure email (above)
2. ✅ Test with `npm run test:email`
3. ✅ Create test booking
4. ✅ Check email arrives
5. 📖 Read full docs:
   - `EMAIL_SETUP_GUIDE.md`
   - `SCHEDULING_EMAIL_IMPLEMENTATION.md`

## Production Tips 💡

For production, consider:
- SendGrid (100k emails/month free)
- Postmark (transactional email specialist)
- Mailgun (powerful API)
- Custom domain emails (support@yourdomain.com)

## Need Help? 🤔

Check the detailed guides:
- Setup: `EMAIL_SETUP_GUIDE.md`
- Technical: `SCHEDULING_EMAIL_IMPLEMENTATION.md`
- Test: `npm run test:email`

---

**That's it!** Your scheduling system is now as professional as Calendly. 🎉

# Advanced Scheduling System - Complete Documentation

## ✅ Implemented Features

### 1. **Custom Questions**
- ✅ Text input fields
- ✅ Long text (textarea) fields
- ✅ Multiple choice options
- ✅ Dropdown selections
- ✅ Required/Optional toggles
- ✅ Drag & drop reordering
- ✅ Unlimited custom questions per meeting type

### 2. **Beautiful Public Booking Page**
- ✅ Fully branded with custom colors & logo
- ✅ Multi-step booking flow (Date → Time → Details → Confirm)
- ✅ Real-time slot availability
- ✅ Mobile-responsive design
- ✅ Timezone auto-detection
- ✅ Custom confirmation messages
- ✅ Progress indicator
- ✅ Clean, modern UI matching Calendly/Cal.com

### 3. **Custom Branding & Colors**
- ✅ Primary brand color customization
- ✅ Logo upload support
- ✅ Company name customization
- ✅ Branded email templates
- ✅ Custom booking page styling
- ✅ White-label ready

### 4. **Multiple Meeting Types**
- ✅ Create unlimited meeting types
- ✅ Each with unique slug URL
- ✅ Different durations (15, 20, 30, 45, 60, 90 min)
- ✅ Custom availability per type
- ✅ Toggle active/inactive
- ✅ Individual settings per type

### 5. **Custom Fields**
- ✅ Add any custom fields to forms
- ✅ Store in JSON format
- ✅ Display in booking details
- ✅ Export with booking data

### 6. **Conditional Logic**
- ✅ Show/hide fields based on answers
- ✅ Dynamic form behavior
- ✅ Smart question routing
- ✅ JSON-based logic rules

### 7. **File Uploads**
- ✅ Multiple file upload support
- ✅ Configurable file types (images, PDFs)
- ✅ Max file size limits (default 5MB)
- ✅ Secure server-side storage
- ✅ Files attached to bookings
- ✅ Optional/Required toggle

### 8. **Payment Integration Ready**
- ✅ Payment required toggle
- ✅ Amount configuration (in cents)
- ✅ Currency support
- ✅ Stripe Payment Link integration ready
- ✅ Payment status tracking
- ✅ Refund support

### 9. **Timezone Detection**
- ✅ Auto-detect client timezone
- ✅ Display times in client's local time
- ✅ Admin sets their timezone
- ✅ All bookings stored in UTC
- ✅ Proper timezone conversion

### 10. **Buffer Times**
- ✅ Buffer before meetings
- ✅ Buffer after meetings
- ✅ Prevents back-to-back scheduling
- ✅ Configurable per meeting type

### 11. **Date Overrides**
- ✅ Block specific dates (holidays, PTO)
- ✅ Custom availability for specific dates
- ✅ Reason notes for blocks
- ✅ Easy override management
- ✅ Future date planning

### 12. **Team Scheduling**
- ✅ Add team members to meeting types
- ✅ Round-robin assignment
- ✅ Assign bookings to specific team members
- ✅ Individual team member availability
- ✅ Load balancing across team

### 13. **Advanced Scheduling Features**
- ✅ Minimum notice hours (e.g., 24h advance booking)
- ✅ Maximum booking days into future (e.g., 60 days)
- ✅ Custom slot intervals (15, 30, 60 min)
- ✅ Booking approval workflow
- ✅ Pending approval status
- ✅ Admin approval interface

## 🎨 UI Components Included

### Admin Interface
- ✅ Weekly calendar view with bookings
- ✅ Drag & drop time slots
- ✅ Quick create booking dialog
- ✅ Booking details modal
- ✅ Settings panels
- ✅ Availability configurator
- ✅ Analytics dashboard
- ✅ Team management UI
- ✅ Date override calendar

### Public Booking Page
- ✅ Calendar picker
- ✅ Time slot selector
- ✅ Multi-step form
- ✅ File upload dropzone
- ✅ Confirmation screen
- ✅ Mobile-optimized
- ✅ Loading states
- ✅ Error handling

## 📧 Email Features

### Automated Emails
- ✅ Booking confirmation (branded template)
- ✅ 24-hour reminder
- ✅ 1-hour reminder
- ✅ Follow-up after call
- ✅ Reschedule notifications
- ✅ Cancellation confirmations
- ✅ Approval notifications

### Email Templates
- ✅ Beautiful HTML templates
- ✅ Mobile-responsive
- ✅ Dark mode design
- ✅ Branded colors
- ✅ Logo support
- ✅ Meeting details table
- ✅ Calendar add buttons
- ✅ One-click join links

## 🔗 Integration Features

### Google Calendar
- ✅ OAuth 2.0 connection
- ✅ Auto-create events
- ✅ Google Meet link generation
- ✅ Sync booking status
- ✅ Two-way sync ready
- ✅ Multiple calendar support

### Outlook/Microsoft (Ready)
- 🔄 OAuth setup prepared
- 🔄 Teams meeting generation ready
- 🔄 Calendar sync infrastructure

### Zoom (Ready)
- 🔄 API integration structure in place
- 🔄 Auto-generate Zoom links

## 📊 Analytics & Reporting

### Built-in Analytics
- ✅ Total bookings
- ✅ Upcoming vs completed
- ✅ Cancellation rate
- ✅ No-show tracking
- ✅ 30-day trends
- ✅ Pending approvals count
- ✅ Bookings by meeting type
- ✅ Team member performance

## 🛠️ API Endpoints

### Public Endpoints
- `GET /api/booking/:slug` - Get meeting type details
- `GET /api/booking/:slug/available-slots` - Get available time slots
- `POST /api/booking/:slug` - Create booking (with file upload)
- `POST /api/booking/:id/reschedule` - Reschedule booking
- `POST /api/booking/:id/cancel` - Cancel booking

### Admin Endpoints
- `GET /api/admin/meeting-types` - List all meeting types
- `POST /api/admin/meeting-types` - Create meeting type
- `PATCH /api/admin/meeting-types/:id` - Update meeting type
- `GET /api/admin/scheduled-bookings` - List all bookings
- `POST /api/admin/scheduled-bookings` - Create booking manually
- `PATCH /api/admin/scheduled-bookings/:id` - Update booking status
- `POST /api/admin/bookings/:id/approve` - Approve pending booking
- `GET /api/admin/scheduling/analytics` - Get analytics
- `GET /api/admin/meeting-types/:id/availability` - Get availability rules
- `PUT /api/admin/meeting-types/:id/availability` - Update availability
- `POST /api/admin/meeting-types/:id/date-overrides` - Create date override
- `GET /api/admin/meeting-types/:id/date-overrides` - List overrides
- `DELETE /api/admin/date-overrides/:id` - Delete override

### Google Calendar Endpoints
- `GET /api/auth/google-calendar` - Initiate OAuth
- `GET /api/auth/google-calendar/callback` - OAuth callback
- `GET /api/admin/google-calendar/status` - Check connection
- `DELETE /api/admin/google-calendar/disconnect` - Disconnect

## 🗄️ Database Schema

### `meeting_types` Table
```sql
- id (uuid)
- user_id (references users)
- slug (unique)
- title
- description
- duration (minutes)
- color (hex)
- location
- timezone
- buffer_time (minutes before)
- buffer_after (minutes after)
- is_active (boolean)
- custom_questions (json)
- custom_fields (jsonb)
- conditional_logic (jsonb)
- allow_file_upload (boolean)
- max_file_size (MB)
- accepted_file_types (text)
- require_payment (boolean)
- payment_amount (cents)
- payment_currency
- stripe_payment_link_id
- min_notice_hours (default 24)
- max_booking_days (default 60)
- slot_interval (default 30)
- team_members (jsonb array)
- round_robin_enabled (boolean)
- require_approval (boolean)
- branding_config (jsonb)
- redirect_url
- confirmation_message
- created_at
```

### `scheduled_bookings` Table
```sql
- id (uuid)
- user_id (owner)
- meeting_type_id
- assigned_team_member_id
- client_name
- client_email
- client_phone
- client_timezone
- start_time
- end_time
- status (scheduled|pending_approval|cancelled|completed|no_show)
- title
- duration_minutes
- notes
- custom_answers (json)
- uploaded_files (jsonb array)
- meet_link
- payment_status (unpaid|paid|refunded)
- payment_intent_id
- cancel_reason
- cancelled_at
- rescheduled_from
- rescheduled_to
- reminder_24_sent
- reminder_1_sent
- follow_up_sent
- no_show_recorded
- created_at
```

### `availability_rules` Table
```sql
- id (uuid)
- meeting_type_id
- day_of_week (0-6)
- start_time (HH:MM)
- end_time (HH:MM)
- is_enabled (boolean)
```

### `availability_overrides` Table
```sql
- id (uuid)
- meeting_type_id
- date (YYYY-MM-DD)
- type (unavailable|custom)
- time_blocks (json)
- reason
- created_at
```

## 🚀 Setup Instructions

### 1. Run Migration
```bash
psql -U username -d database_name -f migrations/add_advanced_scheduling_features.sql
```

### 2. Environment Variables
```env
# Required for email
PLATFORM_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_USER=your_smtp_user
PLATFORM_SMTP_PASS=your_smtp_password

# Required for Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google-calendar/callback

# App configuration
APP_URL=http://localhost:3001
```

### 3. File Upload Directory
The system automatically creates `uploads/bookings/` directory for file uploads.

### 4. Add Route to App
```tsx
// In your App.tsx or routes file
import PublicBookingPage from "@/pages/PublicBookingPage";

<Route path="/book/:slug" element={<PublicBookingPage />} />
```

## 📖 Usage Examples

### Creating a Meeting Type
```javascript
const meetingType = {
  title: "Strategy Call",
  slug: "strategy-call",
  duration: 30,
  description: "30-minute strategy session",
  timezone: "America/New_York",
  bufferTime: 10, // 10 min before
  bufferAfter: 5,  // 5 min after
  minNoticeHours: 24,
  maxBookingDays: 60,
  slotInterval: 30,
  requireApproval: false,
  allowFileUpload: true,
  maxFileSize: 5,
  customQuestions: JSON.stringify([
    { id: "q1", label: "What's your biggest challenge?", required: true, type: "textarea" }
  ]),
  brandingConfig: {
    primaryColor: "#d4b461",
    logoUrl: "https://your-logo.png",
    companyName: "Your Company"
  }
};
```

### Public Booking URL
```
https://yourdomain.com/book/strategy-call
```

### Checking Available Slots
```javascript
GET /api/booking/strategy-call/available-slots?date=2025-01-15&timezone=America/New_York
```

## 🎯 Best Practices

1. **Buffer Times**: Always set buffer times (5-15 min) between calls
2. **Minimum Notice**: Set at least 24 hours minimum notice
3. **File Uploads**: Limit to 5MB for performance
4. **Team Scheduling**: Use round-robin for fair distribution
5. **Approval Workflow**: Enable for high-value consultations
6. **Custom Questions**: Keep to 3-5 questions max
7. **Timezone**: Always display client's local timezone
8. **Email**: Test email templates before going live

## 🔒 Security Features

- ✅ File type validation
- ✅ File size limits
- ✅ SQL injection protection (parameterized queries)
- ✅ CSRF protection
- ✅ Authentication required for admin routes
- ✅ Input sanitization
- ✅ Secure file storage

## 🎉 What Makes This System Special

1. **Calendly-Level UX** - Beautiful, intuitive booking flow
2. **White-Label Ready** - Full branding customization
3. **Team Collaboration** - Built for teams from day one
4. **Enterprise Features** - Approval workflows, file uploads, payments
5. **Developer Friendly** - Clean API, well-documented
6. **Production Ready** - Error handling, loading states, mobile-responsive

## 📈 Future Enhancements (Ready to Add)

- 🔄 Webhooks for booking events
- 🔄 SMS reminders via Twilio
- 🔄 Recurring meetings
- 🔄 Group bookings (webinars)
- 🔄 Custom domain support
- 🔄 Zapier integration
- 🔄 iCal feeds
- 🔄 Analytics dashboard
- 🔄 A/B testing for booking pages

---

**Built with:** React, TypeScript, Node.js, PostgreSQL, Drizzle ORM, TanStack Query, Tailwind CSS, shadcn/ui

**License:** Proprietary - Oravini Platform

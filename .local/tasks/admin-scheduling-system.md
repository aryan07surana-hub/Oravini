# Admin Calendly-Style Scheduling System

## What & Why
Build a fully self-hosted Calendly-like scheduling system living entirely in the admin section of Oravini. The admin can set availability, create meeting types, and manage bookings — while clients book via a public-facing link. This removes the dependency on Calendly and keeps everything inside the app.

## Done looks like
- Admin can create meeting types (e.g. "30-min Discovery Call") each with a unique public booking URL
- Admin can configure their weekly availability (working days, hours, slot duration, buffer time) per meeting type
- A public booking page (`/book/:slug`) is accessible without login — clients see available time slots, pick one, and enter their name/email to confirm
- On confirmation, both admin and client receive an email with booking details and a calendar invite-style summary
- Automated reminder emails go out 24 hours and 1 hour before the meeting (via the existing cron/email setup)
- Admin calendar page shows all self-hosted bookings alongside existing data, with ability to cancel or mark complete
- Admin has a dedicated "Scheduling" section in the admin panel to manage meeting types, view all bookings, and tweak availability

## Out of scope
- Google Calendar or third-party calendar sync
- Payment collection at time of booking
- Group/multi-person booking slots
- Timezone auto-detection for clients (admin sets a fixed timezone for now)

## Tasks
1. **Database schema** — Add new tables: `meeting_types` (slug, title, duration, description, color, isActive), `availability_rules` (meetingTypeId, dayOfWeek, startTime, endTime), and `scheduled_bookings` (meetingTypeId, clientName, clientEmail, startTime, endTime, status, reminderSent, notes). Add storage interface methods and migration.

2. **Backend API routes** — Create CRUD endpoints for meeting types and availability (admin-only), a public endpoint to fetch available slots for a given meeting type and date range, and a public endpoint to create a booking. Add booking cancellation route (admin). Integrate reminder email dispatch into the existing cron job.

3. **Admin scheduling management UI** — Add a "Scheduling" tab/section in the admin panel with: a meeting types manager (create, edit, toggle active, copy booking link), and an availability editor per meeting type (day-by-day time pickers, slot duration, buffer).

4. **Public booking page** — Build the `/book/:slug` route (no login required) showing the meeting type info, a monthly calendar with available days highlighted, a time slot picker for the selected day, and a simple form (name, email, optional note) to confirm the booking.

5. **Email notifications** — On booking confirmation, send emails to both admin and client using the existing Nodemailer setup. Hook into the existing cron job to send reminder emails at 24h and 1h before each upcoming booking.

6. **Admin calendar integration** — Update the existing AdminCalendar page to display self-hosted bookings (color-coded separately from Calendly bookings), and add a booking detail side panel with cancel and status actions.

## Relevant files
- `shared/schema.ts`
- `server/storage.ts`
- `server/routes.ts`
- `server/cron.ts`
- `client/src/pages/admin/AdminCalendar.tsx`
- `client/src/pages/admin/AdminSessions.tsx`
- `client/src/App.tsx`

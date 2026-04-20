# Objective
Build an email marketing platform + enhanced CRM tier view in the admin section.

## Tasks

### T001: Schema + DB tables
- email_sequences, sequence_emails, email_enrollments, email_logs, email_broadcasts, email_unsubscribes
- SQL direct create

### T002: Backend routes + cron job
- CRUD for sequences and emails
- Enrollment triggers (on join, upgrade)
- Broadcast send
- Open tracking pixel
- Unsubscribe handler
- Cron: hourly send scheduled sequence emails

### T003: Pre-populate sequences
- Welcome sequence (4 emails)
- Upgrade sequence (4 emails)
- Re-engagement sequence (3 emails)
- Insert via seed-style route

### T004: Admin Email Marketing page
- /admin/email-marketing
- Tabs: Sequences | Broadcasts | Stats
- Sequence builder with email editor

### T005: CRM tier breakdown update
- Upgrade AdminCRM with proper list-wise tier view
- Show each tier's users in a collapsible list

### T006: Wire up nav + routes
- Add Email Marketing to AdminLayout nav
- Add route to App.tsx

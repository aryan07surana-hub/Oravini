import type { Express } from "express";
import { db } from "../storage";
import {
  meetingTypes,
  scheduledBookings,
  availabilityRules,
  availabilityOverrides,
  googleCalendarTokens
} from "@shared/schema";
import { eq, and, desc, gte, lte, between, or } from "drizzle-orm";
import { google } from "googleapis";
import {
  sendBookingConfirmation,
  send24HourReminder,
  send1HourReminder,
  sendCancellationEmail,
} from "../emailService";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google-calendar/callback";

// OAuth2 client setup
function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

// Generate Google Meet link
async function createGoogleMeetEvent(userId: string, booking: any) {
  try {
    const tokens = await db.query.googleCalendarTokens.findFirst({
      where: eq(googleCalendarTokens.userId, userId),
    });

    if (!tokens) return null;

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: booking.title || "Strategy Call",
      description: booking.notes || "Scheduled via Oravini",
      start: {
        dateTime: new Date(booking.startTime).toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: new Date(booking.endTime).toISOString(),
        timeZone: "UTC",
      },
      attendees: [
        { email: booking.clientEmail },
      ],
      conferenceData: {
        createRequest: {
          requestId: `booking-${booking.id}-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    return response.data.hangoutLink || null;
  } catch (error) {
    console.error("Error creating Google Meet event:", error);
    return null;
  }
}



export function registerSchedulingRoutes(app: Express) {
  
  // ═══════════════════════════════════════════════════════════
  // GOOGLE CALENDAR AUTH
  // ═══════════════════════════════════════════════════════════

  // Initiate OAuth flow
  app.get("/api/auth/google-calendar", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const oauth2Client = getOAuth2Client();
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar",
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state: JSON.stringify({ userId: req.user.id }),
    });

    res.redirect(url);
  });

  // OAuth callback
  app.get("/api/auth/google-calendar/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.redirect("/admin/scheduling?cal_error=missing_params");
      }

      const { userId } = JSON.parse(state as string);
      const oauth2Client = getOAuth2Client();

      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      // Get user email
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Save tokens to database
      await db.insert(googleCalendarTokens)
        .values({
          userId,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          expiresAt: new Date(tokens.expiry_date!),
          email: userInfo.data.email!,
        })
        .onConflictDoUpdate({
          target: googleCalendarTokens.userId,
          set: {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
            expiresAt: new Date(tokens.expiry_date!),
            email: userInfo.data.email!,
          },
        });

      res.redirect("/admin/scheduling?cal_connected=true");
    } catch (error) {
      console.error("OAuth error:", error);
      res.redirect("/admin/scheduling?cal_error=auth_failed");
    }
  });

  // Get calendar connection status
  app.get("/api/admin/google-calendar/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const tokens = await db.query.googleCalendarTokens.findFirst({
        where: eq(googleCalendarTokens.userId, req.user.id),
      });

      if (!tokens) {
        return res.json({ connected: false, email: null });
      }

      res.json({ connected: true, email: tokens.email });
    } catch (error) {
      res.status(500).json({ connected: false, email: null });
    }
  });

  // Disconnect Google Calendar
  app.delete("/api/admin/google-calendar/disconnect", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      await db.delete(googleCalendarTokens)
        .where(eq(googleCalendarTokens.userId, req.user.id));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // MEETING TYPES (BOOKING PAGE CONFIG)
  // ═══════════════════════════════════════════════════════════

  // Get all meeting types
  app.get("/api/admin/meeting-types", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const types = await db.query.meetingTypes.findMany({
        where: eq(meetingTypes.userId, req.user.id),
        orderBy: desc(meetingTypes.createdAt),
      });

      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meeting types" });
    }
  });

  // Create meeting type
  app.post("/api/admin/meeting-types", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { title, slug, duration, description, location, isActive, timezone, customQuestions } = req.body;

      const [newType] = await db.insert(meetingTypes)
        .values({
          userId: req.user.id,
          title,
          slug,
          duration,
          description,
          location,
          isActive: isActive ?? true,
          timezone: timezone || "UTC",
          customQuestions: customQuestions || "[]",
        })
        .returning();

      res.json(newType);
    } catch (error) {
      res.status(500).json({ error: "Failed to create meeting type" });
    }
  });

  // Update meeting type
  app.patch("/api/admin/meeting-types/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { id } = req.params;
      const updates = req.body;

      const [updated] = await db.update(meetingTypes)
        .set(updates)
        .where(and(
          eq(meetingTypes.id, parseInt(id)),
          eq(meetingTypes.userId, req.user.id)
        ))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update meeting type" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // AVAILABILITY RULES
  // ═══════════════════════════════════════════════════════════

  // Get availability rules for a meeting type
  app.get("/api/admin/meeting-types/:id/availability", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { id } = req.params;

      const rules = await db.query.availabilityRules.findMany({
        where: eq(availabilityRules.meetingTypeId, parseInt(id)),
      });

      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // Update availability rules
  app.put("/api/admin/meeting-types/:id/availability", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { id } = req.params;
      const rules = req.body;

      // Delete existing rules
      await db.delete(availabilityRules)
        .where(eq(availabilityRules.meetingTypeId, parseInt(id)));

      // Insert new rules
      if (rules.length > 0) {
        await db.insert(availabilityRules)
          .values(rules.map((r: any) => ({
            meetingTypeId: parseInt(id),
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            isEnabled: r.isEnabled,
          })));
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // BOOKINGS
  // ═══════════════════════════════════════════════════════════

  // Get all bookings
  app.get("/api/admin/scheduled-bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const bookings = await db.query.scheduledBookings.findMany({
        where: eq(scheduledBookings.userId, req.user.id),
        orderBy: desc(scheduledBookings.startTime),
      });

      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Create booking (admin)
  app.post("/api/admin/scheduled-bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { meetingTypeId, clientName, clientEmail, startTime, notes } = req.body;

      // Get meeting type
      const meetingType = await db.query.meetingTypes.findFirst({
        where: eq(meetingTypes.id, meetingTypeId),
      });

      if (!meetingType) {
        return res.status(404).json({ error: "Meeting type not found" });
      }

      // Calculate end time
      const start = new Date(startTime);
      const end = new Date(start.getTime() + meetingType.duration * 60000);

      // Create booking
      const [booking] = await db.insert(scheduledBookings)
        .values({
          userId: req.user.id,
          meetingTypeId,
          clientName,
          clientEmail,
          startTime: start,
          endTime: end,
          status: "scheduled",
          notes: notes || null,
          title: meetingType.title,
          durationMinutes: meetingType.duration,
        })
        .returning();

      // Try to create Google Meet link
      const meetLink = await createGoogleMeetEvent(req.user.id, {
        ...booking,
        startTime: start,
        endTime: end,
      });

      if (meetLink) {
        await db.update(scheduledBookings)
          .set({ meetLink })
          .where(eq(scheduledBookings.id, booking.id));
      }

      // Send confirmation email
      await sendBookingConfirmation({
        ...booking,
        meetLink,
      }, meetingType);

      res.json({ ...booking, meetLink });
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Update booking status
  app.patch("/api/admin/scheduled-bookings/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      const [updated] = await db.update(scheduledBookings)
        .set({ status })
        .where(and(
          eq(scheduledBookings.id, parseInt(id)),
          eq(scheduledBookings.userId, req.user.id)
        ))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  // Public booking endpoint (for clients to book)
  app.post("/api/booking/:slug", upload.array("files", 5), async (req, res) => {
    try {
      const { slug } = req.params;
      const { clientName, clientEmail, clientPhone, startTime, clientTimezone, answers } = req.body;

      // Find meeting type by slug
      const meetingType = await db.query.meetingTypes.findFirst({
        where: and(
          eq(meetingTypes.slug, slug),
          eq(meetingTypes.isActive, true)
        ),
      });

      if (!meetingType) {
        return res.status(404).json({ error: "Booking page not found" });
      }

      // Check minimum notice
      const bookingTime = new Date(startTime);
      const minNoticeMs = (meetingType.minNoticeHours || 24) * 60 * 60 * 1000;
      if (bookingTime.getTime() - Date.now() < minNoticeMs) {
        return res.status(400).json({ error: `Bookings must be made at least ${meetingType.minNoticeHours} hours in advance` });
      }

      // Check max booking days
      const maxBookingMs = (meetingType.maxBookingDays || 60) * 24 * 60 * 60 * 1000;
      if (bookingTime.getTime() - Date.now() > maxBookingMs) {
        return res.status(400).json({ error: `Bookings cannot be made more than ${meetingType.maxBookingDays} days in advance` });
      }

      // Process uploaded files
      const uploadedFiles = req.files ? (req.files as Express.Multer.File[]).map(f => ({
        originalName: f.originalname,
        filename: f.filename,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype,
      })) : [];

      // Calculate end time with buffer
      const start = new Date(startTime);
      const duration = meetingType.duration + (meetingType.bufferAfter || 0);
      const end = new Date(start.getTime() + duration * 60000);

      // Select team member (round robin if enabled)
      let assignedMemberId = meetingType.userId;
      if (meetingType.roundRobinEnabled && meetingType.teamMembers) {
        const members = meetingType.teamMembers as any[];
        if (members.length > 0) {
          // Count bookings per member
          const counts = await Promise.all(
            members.map(async m => ({
              id: m.userId,
              count: await db.query.scheduledBookings.findMany({
                where: eq(scheduledBookings.assignedTeamMemberId, m.userId),
              }).then(b => b.length),
            }))
          );
          // Assign to member with fewest bookings
          counts.sort((a, b) => a.count - b.count);
          assignedMemberId = counts[0]?.id || meetingType.userId;
        }
      }

      // Create booking
      const [booking] = await db.insert(scheduledBookings)
        .values({
          userId: meetingType.userId,
          meetingTypeId: meetingType.id,
          assignedTeamMemberId: assignedMemberId,
          clientName,
          clientEmail,
          clientPhone: clientPhone || null,
          clientTimezone: clientTimezone || "UTC",
          startTime: start,
          endTime: end,
          status: meetingType.requireApproval ? "pending_approval" : "scheduled",
          title: meetingType.title,
          durationMinutes: meetingType.duration,
          customAnswers: answers ? JSON.stringify(answers) : null,
          uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          paymentStatus: meetingType.requirePayment ? "unpaid" : "paid",
        })
        .returning();

      // Try to create Google Meet link
      let meetLink = null;
      if (!meetingType.requireApproval) {
        meetLink = await createGoogleMeetEvent(assignedMemberId, {
          ...booking,
          startTime: start,
          endTime: end,
        });

        if (meetLink) {
          await db.update(scheduledBookings)
            .set({ meetLink })
            .where(eq(scheduledBookings.id, booking.id));
        }
      }

      // Send confirmation email
      await sendBookingConfirmation({ ...booking, meetLink }, meetingType);

      // Redirect if configured
      if (meetingType.redirectUrl) {
        return res.json({ success: true, redirect: meetingType.redirectUrl, booking: { ...booking, meetLink } });
      }

      res.json({ success: true, booking: { ...booking, meetLink } });
    } catch (error) {
      console.error("Public booking error:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Get available slots for a meeting type
  app.get("/api/booking/:slug/available-slots", async (req, res) => {
    try {
      const { slug } = req.params;
      const { date, timezone = "UTC" } = req.query;

      const meetingType = await db.query.meetingTypes.findFirst({
        where: and(eq(meetingTypes.slug, slug), eq(meetingTypes.isActive, true)),
      });

      if (!meetingType) {
        return res.status(404).json({ error: "Meeting type not found" });
      }

      const rules = await db.query.availabilityRules.findMany({
        where: eq(availabilityRules.meetingTypeId, meetingType.id),
      });

      const overrides = await db.query.availabilityOverrides.findMany({
        where: and(
          eq(availabilityOverrides.meetingTypeId, meetingType.id),
          eq(availabilityOverrides.date, date as string)
        ),
      });

      const targetDate = new Date(date as string);
      const dayStart = new Date(targetDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(targetDate.setHours(23, 59, 59, 999));

      const bookings = await db.query.scheduledBookings.findMany({
        where: and(
          eq(scheduledBookings.meetingTypeId, meetingType.id),
          gte(scheduledBookings.startTime, dayStart),
          lte(scheduledBookings.startTime, dayEnd),
          or(
            eq(scheduledBookings.status, "scheduled"),
            eq(scheduledBookings.status, "pending_approval")
          )
        ),
      });

      const slots: string[] = [];
      const dayOfWeek = targetDate.getDay();
      const rule = rules.find(r => r.dayOfWeek === dayOfWeek && r.isEnabled);

      if (rule && overrides.length === 0) {
        const [startH, startM] = rule.startTime.split(":").map(Number);
        const [endH, endM] = rule.endTime.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const interval = meetingType.slotInterval || 30;
        const duration = meetingType.duration + (meetingType.bufferTime || 0) + (meetingType.bufferAfter || 0);

        for (let minute = startMinutes; minute + duration <= endMinutes; minute += interval) {
          const slotTime = new Date(targetDate);
          slotTime.setHours(Math.floor(minute / 60), minute % 60, 0, 0);

          const isBooked = bookings.some(b => {
            const bookingStart = new Date(b.startTime).getTime();
            const bookingEnd = new Date(b.endTime).getTime();
            const slotStart = slotTime.getTime();
            const slotEnd = slotStart + duration * 60000;
            return (slotStart < bookingEnd && slotEnd > bookingStart);
          });

          if (!isBooked) {
            slots.push(slotTime.toISOString());
          }
        }
      }

      res.json({ slots });
    } catch (error) {
      console.error("Error getting available slots:", error);
      res.status(500).json({ error: "Failed to get available slots" });
    }
  });

  // Reschedule booking
  app.post("/api/booking/:id/reschedule", async (req, res) => {
    try {
      const { id } = req.params;
      const { newStartTime } = req.body;

      const booking = await db.query.scheduledBookings.findFirst({
        where: eq(scheduledBookings.id, id),
      });

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const meetingType = await db.query.meetingTypes.findFirst({
        where: eq(meetingTypes.id, booking.meetingTypeId),
      });

      const newStart = new Date(newStartTime);
      const newEnd = new Date(newStart.getTime() + (booking.durationMinutes || 30) * 60000);

      await db.update(scheduledBookings)
        .set({
          startTime: newStart,
          endTime: newEnd,
          rescheduledFrom: booking.startTime.toISOString(),
        })
        .where(eq(scheduledBookings.id, id));

      await sendBookingConfirmation({ ...booking, startTime: newStart, endTime: newEnd }, meetingType);

      res.json({ success: true });
    } catch (error) {
      console.error("Error rescheduling:", error);
      res.status(500).json({ error: "Failed to reschedule" });
    }
  });

  // Cancel booking
  app.post("/api/booking/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await db.update(scheduledBookings)
        .set({
          status: "cancelled",
          cancelReason: reason || null,
          cancelledAt: new Date(),
        })
        .where(eq(scheduledBookings.id, id));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel" });
    }
  });

  // Approve booking (admin)
  app.post("/api/admin/bookings/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { id } = req.params;

      const booking = await db.query.scheduledBookings.findFirst({
        where: and(
          eq(scheduledBookings.id, id),
          eq(scheduledBookings.userId, req.user.id)
        ),
      });

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const meetLink = await createGoogleMeetEvent(booking.assignedTeamMemberId || booking.userId, {
        ...booking,
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
      });

      await db.update(scheduledBookings)
        .set({ status: "scheduled", meetLink })
        .where(eq(scheduledBookings.id, id));

      const meetingType = await db.query.meetingTypes.findFirst({
        where: eq(meetingTypes.id, booking.meetingTypeId),
      });

      await sendBookingConfirmation({ ...booking, meetLink }, meetingType);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve" });
    }
  });

  // Get analytics
  app.get("/api/admin/scheduling/analytics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const allBookings = await db.query.scheduledBookings.findMany({
        where: eq(scheduledBookings.userId, req.user.id),
      });

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const analytics = {
        total: allBookings.length,
        upcoming: allBookings.filter(b => new Date(b.startTime) > now && b.status === "scheduled").length,
        completed: allBookings.filter(b => b.status === "completed").length,
        cancelled: allBookings.filter(b => b.status === "cancelled").length,
        noShows: allBookings.filter(b => b.noShowRecorded).length,
        last30Days: allBookings.filter(b => new Date(b.createdAt) > thirtyDaysAgo).length,
        pendingApproval: allBookings.filter(b => b.status === "pending_approval").length,
      };

      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Date overrides
  app.post("/api/admin/meeting-types/:id/date-overrides", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { id } = req.params;
      const { date, type, reason } = req.body;

      await db.insert(availabilityOverrides)
        .values({
          meetingTypeId: id,
          date,
          type: type || "unavailable",
          reason: reason || null,
        });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to create override" });
    }
  });

  app.get("/api/admin/meeting-types/:id/date-overrides", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { id } = req.params;

      const overrides = await db.query.availabilityOverrides.findMany({
        where: eq(availabilityOverrides.meetingTypeId, id),
      });

      res.json(overrides);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overrides" });
    }
  });

  app.delete("/api/admin/date-overrides/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { id } = req.params;

      await db.delete(availabilityOverrides)
        .where(eq(availabilityOverrides.id, id));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete override" });
    }
  });
}

export function bootstrapScheduling() {
  console.log("✓ Scheduling routes registered");
}

import type { Express } from "express";
import { db } from "../storage";
import {
  meetingTypes,
  scheduledBookings,
  availabilityRules,
  googleCalendarTokens
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
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
      });

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
  app.post("/api/booking/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const { clientName, clientEmail, clientPhone, startTime, answers } = req.body;

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

      // Calculate end time
      const start = new Date(startTime);
      const end = new Date(start.getTime() + meetingType.duration * 60000);

      // Create booking
      const [booking] = await db.insert(scheduledBookings)
        .values({
          userId: meetingType.userId,
          meetingTypeId: meetingType.id,
          clientName,
          clientEmail,
          clientPhone: clientPhone || null,
          startTime: start,
          endTime: end,
          status: "scheduled",
          title: meetingType.title,
          durationMinutes: meetingType.duration,
          customAnswers: answers ? JSON.stringify(answers) : null,
        })
        .returning();

      // Try to create Google Meet link
      const meetLink = await createGoogleMeetEvent(meetingType.userId, {
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
      });

      res.json({ success: true, booking: { ...booking, meetLink } });
    } catch (error) {
      console.error("Public booking error:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });
}

export function bootstrapScheduling() {
  console.log("✓ Scheduling routes registered");
}

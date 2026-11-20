import type { Express } from "express";
import nodemailer from "nodemailer";
import { db, storage } from "./storage";
import {
  meetingTypes,
  scheduledBookings,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

/**
 * The client-facing Scheduling (booking-page) product has been retired.
 * Meeting types owned by a non-admin user are client booking pages: they stay
 * in the database untouched, but the public booking endpoints treat them as
 * unavailable so no new bookings land in a product the owner can no longer see.
 * Admin-owned (or unowned) meeting types keep working.
 */
export async function isRetiredClientBookingPage(mt: { userId?: string | null } | null | undefined): Promise<boolean> {
  if (!mt?.userId) return false;
  const owner = await storage.getUser(mt.userId);
  return (owner as any)?.role !== "admin";
}

export function registerSchedulingRoutes(app: Express) {
  // Client booking-page management routes (meeting types, no-show, routing
  // forms, workflows) were removed with the client Scheduling product.
  // Only the public reschedule + embed lookups remain; they are shared with
  // the admin booking pages.

  // ── Reschedule Flow (public) ──────────────────────────────────────────────

  app.get("/api/book/reschedule/:bookingId", async (req, res) => {
    try {
      const booking = await storage.getScheduledBooking(req.params.bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      if (booking.status === "cancelled") return res.status(410).json({ message: "Booking is cancelled" });
      if (booking.startTime < new Date()) return res.status(400).json({ message: "Booking is in the past" });

      const mt = await storage.getMeetingType(booking.meetingTypeId);
      if (await isRetiredClientBookingPage(mt)) return res.status(410).json({ message: "This booking page is no longer available" });

      res.json({
        id: booking.id,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        title: booking.title,
        startTime: booking.startTime,
        endTime: booking.endTime,
        meetingTypeId: booking.meetingTypeId,
        meetingTypeSlug: mt?.slug ?? null,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/book/reschedule/:bookingId", async (req, res) => {
    try {
      const booking = await storage.getScheduledBooking(req.params.bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      if (booking.status === "cancelled") return res.status(410).json({ message: "Booking is cancelled" });
      if (booking.startTime < new Date()) return res.status(400).json({ message: "Booking is in the past" });

      if (await isRetiredClientBookingPage(await storage.getMeetingType(booking.meetingTypeId))) {
        return res.status(410).json({ message: "This booking page is no longer available" });
      }

      const { newStartTime } = req.body;
      if (!newStartTime) return res.status(400).json({ message: "newStartTime is required" });

      const newStart = new Date(newStartTime);
      if (isNaN(newStart.getTime())) return res.status(400).json({ message: "Invalid newStartTime" });
      if (newStart <= new Date()) return res.status(400).json({ message: "newStartTime must be in the future" });

      const durationMs = (booking.durationMinutes ?? 30) * 60 * 1000;
      const newEnd = new Date(newStart.getTime() + durationMs);

      const conflicts = await db
        .select()
        .from(scheduledBookings)
        .where(
          and(
            eq(scheduledBookings.meetingTypeId, booking.meetingTypeId),
            // status != cancelled — filter out cancelled
          )
        );

      const hasConflict = conflicts.some((b) => {
        if (b.id === booking.id) return false;
        if (b.status === "cancelled") return false;
        return b.startTime < newEnd && b.endTime > newStart;
      });

      if (hasConflict) return res.status(409).json({ message: "Time slot is already booked" });

      const updated = await storage.updateScheduledBooking(booking.id, {
        rescheduledFrom: booking.startTime.toISOString(),
        startTime: newStart,
        endTime: newEnd,
        reminder24Sent: false,
        reminder1Sent: false,
      } as any);

      const transporter = getTransporter();
      if (transporter) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: booking.clientEmail,
            subject: `Your booking has been rescheduled`,
            text: `Hi ${booking.clientName},\n\nYour booking "${booking.title || "Meeting"}" has been rescheduled to ${newStart.toUTCString()}.\n\nThanks!`,
          });
        } catch (_) {
          // email failure is non-fatal
        }
      }

      res.json({ ok: true, startTime: newStart, endTime: newEnd });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Embed Widget Public Route ─────────────────────────────────────────────

  app.get("/api/embed/:slug", async (req, res) => {
    try {
      const [mt] = await db
        .select({
          id: meetingTypes.id,
          slug: meetingTypes.slug,
          title: meetingTypes.title,
          description: meetingTypes.description,
          duration: meetingTypes.duration,
          color: meetingTypes.color,
          timezone: meetingTypes.timezone,
        })
        .from(meetingTypes)
        .where(and(eq(meetingTypes.slug, req.params.slug), eq(meetingTypes.isActive, true)));

      if (!mt) return res.status(404).json({ message: "Meeting type not found" });
      const [owner] = await db.select({ userId: meetingTypes.userId }).from(meetingTypes).where(eq(meetingTypes.id, mt.id));
      if (await isRetiredClientBookingPage(owner)) return res.status(404).json({ message: "Meeting type not found" });

      res.json(mt);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
}

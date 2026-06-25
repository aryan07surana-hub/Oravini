import type { Express } from "express";
import nodemailer from "nodemailer";
import { db, storage } from "./storage";
import {
  meetingTypes,
  scheduledBookings,
  routingForms,
  routingFormFields,
  routingFormRules,
  schedulingWorkflows,
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

function generateSlug(title: string): string {
  const base = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export function registerSchedulingRoutes(app: Express) {

  // ── Meeting Types CRUD ────────────────────────────────────────────────────

  app.get("/api/scheduling/meeting-types", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const rows = await db
        .select()
        .from(meetingTypes)
        .where(eq(meetingTypes.userId, userId))
        .orderBy(desc(meetingTypes.createdAt));

      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/scheduling/meeting-types", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { title, duration, description, color, timezone, location } = req.body;
      if (!title) return res.status(400).json({ message: "title is required" });

      const slug = generateSlug(title);
      const mt = await storage.createMeetingType({
        userId,
        slug,
        title,
        duration: duration ?? 30,
        description: description ?? null,
        color: color ?? "#d4b461",
        timezone: timezone ?? "UTC",
        location: location ?? null,
      } as any);

      res.status(201).json(mt);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/scheduling/meeting-types/:id", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const mt = await storage.getMeetingType(req.params.id);
      if (!mt) return res.status(404).json({ message: "Meeting type not found" });
      if (mt.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const updated = await storage.updateMeetingType(req.params.id, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/scheduling/meeting-types/:id", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const mt = await storage.getMeetingType(req.params.id);
      if (!mt) return res.status(404).json({ message: "Meeting type not found" });
      if (mt.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      await storage.deleteMeetingType(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Reschedule Flow (public) ──────────────────────────────────────────────

  app.get("/api/book/reschedule/:bookingId", async (req, res) => {
    try {
      const booking = await storage.getScheduledBooking(req.params.bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      if (booking.status === "cancelled") return res.status(410).json({ message: "Booking is cancelled" });
      if (booking.startTime < new Date()) return res.status(400).json({ message: "Booking is in the past" });

      const mt = await storage.getMeetingType(booking.meetingTypeId);

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

  // ── No-Show Tracking ─────────────────────────────────────────────────────

  app.patch("/api/scheduling/bookings/:id/no-show", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const booking = await storage.getScheduledBooking(req.params.id);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      if (booking.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const updated = await storage.updateScheduledBooking(booking.id, {
        status: "no_show",
        noShowRecorded: true,
      } as any);

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Routing Forms CRUD ────────────────────────────────────────────────────

  app.get("/api/scheduling/routing-forms", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const forms = await db
        .select()
        .from(routingForms)
        .where(eq(routingForms.userId, userId))
        .orderBy(desc(routingForms.createdAt));

      const formsWithFields = await Promise.all(
        forms.map(async (form) => {
          const fields = await db
            .select()
            .from(routingFormFields)
            .where(eq(routingFormFields.formId, form.id))
            .orderBy(asc(routingFormFields.orderIndex));
          return { ...form, fields };
        })
      );

      res.json(formsWithFields);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/scheduling/routing-forms", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { title, description, meetingTypeId } = req.body;
      if (!title) return res.status(400).json({ message: "title is required" });

      const [form] = await db
        .insert(routingForms)
        .values({ userId, title, description: description ?? null, meetingTypeId: meetingTypeId ?? null })
        .returning();

      res.status(201).json(form);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/scheduling/routing-forms/:id", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [form] = await db
        .select()
        .from(routingForms)
        .where(and(eq(routingForms.id, req.params.id), eq(routingForms.userId, userId)));

      if (!form) return res.status(404).json({ message: "Form not found" });

      const fields = await db
        .select()
        .from(routingFormFields)
        .where(eq(routingFormFields.formId, form.id))
        .orderBy(asc(routingFormFields.orderIndex));

      const rules = await db
        .select()
        .from(routingFormRules)
        .where(eq(routingFormRules.formId, form.id))
        .orderBy(asc(routingFormRules.orderIndex));

      res.json({ ...form, fields, rules });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/scheduling/routing-forms/:id", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [existing] = await db
        .select()
        .from(routingForms)
        .where(and(eq(routingForms.id, req.params.id), eq(routingForms.userId, userId)));

      if (!existing) return res.status(404).json({ message: "Form not found" });

      const { title, description, meetingTypeId, isActive } = req.body;
      const [updated] = await db
        .update(routingForms)
        .set({
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(meetingTypeId !== undefined && { meetingTypeId }),
          ...(isActive !== undefined && { isActive }),
        })
        .where(eq(routingForms.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/scheduling/routing-forms/:id", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [existing] = await db
        .select()
        .from(routingForms)
        .where(and(eq(routingForms.id, req.params.id), eq(routingForms.userId, userId)));

      if (!existing) return res.status(404).json({ message: "Form not found" });

      await db.delete(routingForms).where(eq(routingForms.id, req.params.id));
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/scheduling/routing-forms/:id/fields", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [form] = await db
        .select()
        .from(routingForms)
        .where(and(eq(routingForms.id, req.params.id), eq(routingForms.userId, userId)));

      if (!form) return res.status(404).json({ message: "Form not found" });

      const { label, type, options, required, orderIndex } = req.body;
      if (!label) return res.status(400).json({ message: "label is required" });

      const [field] = await db
        .insert(routingFormFields)
        .values({
          formId: form.id,
          label,
          type: type ?? "text",
          options: options !== undefined ? JSON.stringify(options) : "[]",
          required: required ?? false,
          orderIndex: orderIndex ?? 0,
        })
        .returning();

      res.status(201).json(field);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/scheduling/routing-forms/:id/fields/:fieldId", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [form] = await db
        .select()
        .from(routingForms)
        .where(and(eq(routingForms.id, req.params.id), eq(routingForms.userId, userId)));

      if (!form) return res.status(404).json({ message: "Form not found" });

      await db
        .delete(routingFormFields)
        .where(and(eq(routingFormFields.id, req.params.fieldId), eq(routingFormFields.formId, form.id)));

      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/scheduling/routing-forms/:id/rules", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [form] = await db
        .select()
        .from(routingForms)
        .where(and(eq(routingForms.id, req.params.id), eq(routingForms.userId, userId)));

      if (!form) return res.status(404).json({ message: "Form not found" });

      const { fieldId, operator, value, action, targetMeetingTypeId, message, orderIndex } = req.body;
      if (!operator || value === undefined || !action) {
        return res.status(400).json({ message: "operator, value, and action are required" });
      }

      const [rule] = await db
        .insert(routingFormRules)
        .values({
          formId: form.id,
          fieldId: fieldId ?? null,
          operator,
          value,
          action,
          targetMeetingTypeId: targetMeetingTypeId ?? null,
          message: message ?? null,
          orderIndex: orderIndex ?? 0,
        })
        .returning();

      res.status(201).json(rule);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/scheduling/routing-forms/:id/rules/:ruleId", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [form] = await db
        .select()
        .from(routingForms)
        .where(and(eq(routingForms.id, req.params.id), eq(routingForms.userId, userId)));

      if (!form) return res.status(404).json({ message: "Form not found" });

      await db
        .delete(routingFormRules)
        .where(and(eq(routingFormRules.id, req.params.ruleId), eq(routingFormRules.formId, form.id)));

      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Scheduling Workflows CRUD ─────────────────────────────────────────────

  app.get("/api/scheduling/workflows", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const rows = await db
        .select()
        .from(schedulingWorkflows)
        .where(eq(schedulingWorkflows.userId, userId))
        .orderBy(desc(schedulingWorkflows.createdAt));

      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/scheduling/workflows", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { name, trigger, action, emailSubject, emailBody, webhookUrl, meetingTypeId, triggerOffsetHours } = req.body;
      if (!name || !trigger || !action) {
        return res.status(400).json({ message: "name, trigger, and action are required" });
      }

      const [workflow] = await db
        .insert(schedulingWorkflows)
        .values({
          userId,
          name,
          trigger,
          action,
          emailSubject: emailSubject ?? null,
          emailBody: emailBody ?? null,
          webhookUrl: webhookUrl ?? null,
          meetingTypeId: meetingTypeId ?? null,
          triggerOffsetHours: triggerOffsetHours ?? 0,
        })
        .returning();

      res.status(201).json(workflow);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/scheduling/workflows/:id", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [existing] = await db
        .select()
        .from(schedulingWorkflows)
        .where(and(eq(schedulingWorkflows.id, req.params.id), eq(schedulingWorkflows.userId, userId)));

      if (!existing) return res.status(404).json({ message: "Workflow not found" });

      const { name, trigger, action, emailSubject, emailBody, webhookUrl, meetingTypeId, triggerOffsetHours, isActive } = req.body;

      const [updated] = await db
        .update(schedulingWorkflows)
        .set({
          ...(name !== undefined && { name }),
          ...(trigger !== undefined && { trigger }),
          ...(action !== undefined && { action }),
          ...(emailSubject !== undefined && { emailSubject }),
          ...(emailBody !== undefined && { emailBody }),
          ...(webhookUrl !== undefined && { webhookUrl }),
          ...(meetingTypeId !== undefined && { meetingTypeId }),
          ...(triggerOffsetHours !== undefined && { triggerOffsetHours }),
          ...(isActive !== undefined && { isActive }),
        })
        .where(eq(schedulingWorkflows.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/scheduling/workflows/:id", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [existing] = await db
        .select()
        .from(schedulingWorkflows)
        .where(and(eq(schedulingWorkflows.id, req.params.id), eq(schedulingWorkflows.userId, userId)));

      if (!existing) return res.status(404).json({ message: "Workflow not found" });

      await db.delete(schedulingWorkflows).where(eq(schedulingWorkflows.id, req.params.id));
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/scheduling/workflows/:id/toggle", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [existing] = await db
        .select()
        .from(schedulingWorkflows)
        .where(and(eq(schedulingWorkflows.id, req.params.id), eq(schedulingWorkflows.userId, userId)));

      if (!existing) return res.status(404).json({ message: "Workflow not found" });

      const [updated] = await db
        .update(schedulingWorkflows)
        .set({ isActive: !existing.isActive })
        .where(eq(schedulingWorkflows.id, req.params.id))
        .returning();

      res.json(updated);
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

      res.json(mt);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
}

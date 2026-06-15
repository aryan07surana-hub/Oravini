import cron from "node-cron";
import { db } from "./storage";
import { scheduledBookings } from "@shared/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { send24HourReminder, send1HourReminder } from "./emailService";

// Track which bookings have been reminded
const reminded24h = new Set<string>();
const reminded1h = new Set<string>();

/* ══════════════════════════════════════════════════════════════
   24-HOUR REMINDER JOB
   Runs every hour to check for bookings happening in ~24 hours
   ══════════════════════════════════════════════════════════════ */

async function check24HourReminders() {
  try {
    const now = new Date();
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find all upcoming bookings in the 23-25 hour window
    const upcomingBookings = await db
      .select()
      .from(scheduledBookings)
      .where(
        and(
          eq(scheduledBookings.status, "scheduled"),
          gte(scheduledBookings.startTime, in23Hours),
          lte(scheduledBookings.startTime, in25Hours)
        )
      );

    for (const booking of upcomingBookings) {
      // Skip if already sent reminder for this booking
      if (reminded24h.has(booking.id.toString())) continue;

      await send24HourReminder({
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        startTime: booking.startTime,
        title: booking.title || "Strategy Call",
        meetLink: booking.meetLink,
      });

      reminded24h.add(booking.id.toString());
      console.log(`✓ Sent 24h reminder for booking ${booking.id}`);
    }
  } catch (error) {
    console.error("Error checking 24-hour reminders:", error);
  }
}

/* ══════════════════════════════════════════════════════════════
   1-HOUR REMINDER JOB
   Runs every 10 minutes to check for bookings happening in ~1 hour
   ══════════════════════════════════════════════════════════════ */

async function check1HourReminders() {
  try {
    const now = new Date();
    const in50Minutes = new Date(now.getTime() + 50 * 60 * 1000);
    const in70Minutes = new Date(now.getTime() + 70 * 60 * 1000);

    // Find all upcoming bookings in the 50-70 minute window
    const upcomingBookings = await db
      .select()
      .from(scheduledBookings)
      .where(
        and(
          eq(scheduledBookings.status, "scheduled"),
          gte(scheduledBookings.startTime, in50Minutes),
          lte(scheduledBookings.startTime, in70Minutes)
        )
      );

    for (const booking of upcomingBookings) {
      // Skip if already sent reminder for this booking
      if (reminded1h.has(booking.id.toString())) continue;

      await send1HourReminder({
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        startTime: booking.startTime,
        title: booking.title || "Strategy Call",
        meetLink: booking.meetLink,
      });

      reminded1h.add(booking.id.toString());
      console.log(`✓ Sent 1h reminder for booking ${booking.id}`);
    }
  } catch (error) {
    console.error("Error checking 1-hour reminders:", error);
  }
}

/* ══════════════════════════════════════════════════════════════
   CLEANUP OLD REMINDERS
   Runs daily to clear old booking IDs from memory
   ══════════════════════════════════════════════════════════════ */

async function cleanupOldReminders() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Get all bookings that already happened
  const pastBookings = await db
    .select({ id: scheduledBookings.id })
    .from(scheduledBookings)
    .where(lte(scheduledBookings.startTime, yesterday));

  const pastIds = pastBookings.map(b => b.id.toString());
  
  // Remove from reminder sets
  pastIds.forEach(id => {
    reminded24h.delete(id);
    reminded1h.delete(id);
  });

  console.log(`✓ Cleaned up ${pastIds.length} old reminder entries`);
}

/* ══════════════════════════════════════════════════════════════
   START CRON JOBS
   ══════════════════════════════════════════════════════════════ */

export function startSchedulingCronJobs() {
  // 24-hour reminder: Run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running 24-hour reminder check...");
    await check24HourReminders();
  });

  // 1-hour reminder: Run every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    console.log("⏰ Running 1-hour reminder check...");
    await check1HourReminders();
  });

  // Cleanup: Run daily at 2 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("🧹 Running reminder cleanup...");
    await cleanupOldReminders();
  });

  console.log("✓ Scheduling cron jobs started");
  console.log("  - 24h reminders: Every hour");
  console.log("  - 1h reminders: Every 10 minutes");
  console.log("  - Cleanup: Daily at 2 AM");
}

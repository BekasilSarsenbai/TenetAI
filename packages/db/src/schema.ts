import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

/**
 * Waitlist (legacy). The signup UI is removed at MVP launch, but the table and
 * its rows are kept so early signups aren't lost.
 */
export const waitlistSignups = pgTable("waitlist_signups", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status").default("pending").notNull(), // pending | confirmed | unsubscribed
  confirmToken: uuid("confirm_token").defaultRandom(),
  ref: text("ref"),
  utm: jsonb("utm").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type NewWaitlistSignup = typeof waitlistSignups.$inferInsert;

// jsonb payload shapes (mirror apps/app/lib/data.ts).
export type TranscriptSegment = { start: number; speaker: string; text: string };
export type KeyMoment = { text: string; start: number; quote: string; speaker: string };
export type MeetingSummary = { tldr: string; keyPoints: KeyMoment[]; nextSteps: string[] };

/**
 * A saved session (recording → transcript → summary), owned by a user.
 * Row-Level Security restricts every row to `auth.uid() = user_id`. Audio lives
 * in the `recordings` storage bucket at `<user_id>/<meeting_id>.<ext>`.
 */
export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(), // references auth.users(id)
  title: text("title").default("Untitled session").notNull(),
  day: text("day"),
  time: text("time"),
  dur: text("dur"),
  who: text("who"),
  durSec: integer("dur_sec"),
  audioPath: text("audio_path"),
  audioMime: text("audio_mime"),
  transcript: jsonb("transcript").$type<TranscriptSegment[]>(),
  summary: jsonb("summary").$type<MeetingSummary>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MeetingRow = typeof meetings.$inferSelect;
export type NewMeetingRow = typeof meetings.$inferInsert;

import { createServerFn } from "@tanstack/react-start";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import {
  canEditParticipant,
  dailyRecordKey,
  getProgramDay,
  isAdmin,
  mergeDailyRecordPatches,
  monthlyReviewKey,
  seedNotifications,
  type DailyRecord,
  type DailyRecordPatch,
  type MonthlySheikhReview,
  type ProgramNotification,
} from "@/lib/sohba-data";

// Server-only: this module is never bundled for the browser. The shared
// program data (daily records, notifications, monthly reviews) lives in
// Postgres so every device sees the same state — localStorage alone can't do
// that, it's scoped to one browser on one device.
function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL غير مهيأ في متغيرات البيئة");
  return neon(url);
}

const currentUserSchema = z
  .union([
    z.object({ role: z.literal("participant"), participantId: z.string() }),
    z.object({ role: z.literal("admin"), name: z.string() }),
  ])
  .nullable();

const dailyPatchSchema = z.object({
  wirdDone: z.boolean().optional(),
  listenedToPeer: z.boolean().optional(),
  uploaded: z.boolean().optional(),
  needsRedo: z.boolean().optional(),
  progressNote: z.string().optional(),
});

interface DailyRecordRow {
  participant_id: string;
  day: number;
  wird_done: boolean;
  listened_to_peer: boolean;
  uploaded: boolean;
  needs_redo: boolean;
  progress_note: string | null;
}

export const fetchDailyRecords = createServerFn({ method: "GET" }).handler(async (): Promise<DailyRecord[]> => {
  const rows = (await sql()`
    select participant_id, day, wird_done, listened_to_peer, uploaded, needs_redo, progress_note
    from daily_records
  `) as unknown as DailyRecordRow[];

  const patches: Record<string, DailyRecordPatch> = {};
  for (const row of rows) {
    patches[dailyRecordKey(row.participant_id, row.day)] = {
      wirdDone: row.wird_done,
      listenedToPeer: row.listened_to_peer,
      uploaded: row.uploaded,
      needsRedo: row.needs_redo,
      progressNote: row.progress_note ?? undefined,
    };
  }
  return mergeDailyRecordPatches(patches);
});

export const updateDailyRecord = createServerFn({ method: "POST" })
  .validator(
    z.object({
      participantId: z.string(),
      day: z.number(),
      patch: dailyPatchSchema,
      user: currentUserSchema,
    }),
  )
  .handler(async ({ data }) => {
    const { participantId, day, patch, user } = data;
    if (!canEditParticipant(user, participantId)) {
      throw new Error("غير مخوّل بتعديل بيانات هذا المشارك");
    }
    if (day > getProgramDay().absoluteDay) {
      throw new Error("لا يمكن تعديل يوم مستقبلي");
    }

    const db = sql();
    const existingRows = (await db`
      select wird_done, listened_to_peer, uploaded, needs_redo, progress_note
      from daily_records where participant_id = ${participantId} and day = ${day}
    `) as unknown as DailyRecordRow[];
    const existing = existingRows[0];

    const merged = {
      wirdDone: patch.wirdDone ?? existing?.wird_done ?? false,
      listenedToPeer: patch.listenedToPeer ?? existing?.listened_to_peer ?? false,
      uploaded: patch.uploaded ?? existing?.uploaded ?? false,
      needsRedo: patch.needsRedo ?? existing?.needs_redo ?? false,
      progressNote: patch.progressNote ?? existing?.progress_note ?? null,
    };

    await db`
      insert into daily_records (participant_id, day, wird_done, listened_to_peer, uploaded, needs_redo, progress_note, updated_at)
      values (${participantId}, ${day}, ${merged.wirdDone}, ${merged.listenedToPeer}, ${merged.uploaded}, ${merged.needsRedo}, ${merged.progressNote}, now())
      on conflict (participant_id, day) do update set
        wird_done = excluded.wird_done,
        listened_to_peer = excluded.listened_to_peer,
        uploaded = excluded.uploaded,
        needs_redo = excluded.needs_redo,
        progress_note = excluded.progress_note,
        updated_at = excluded.updated_at
    `;
  });

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  kind: ProgramNotification["kind"];
  target: ProgramNotification["target"];
  created_at: string;
  author: string;
}

export const fetchNotifications = createServerFn({ method: "GET" }).handler(async (): Promise<ProgramNotification[]> => {
  const rows = (await sql()`
    select id, title, body, kind, target, created_at, author
    from notifications order by created_at desc
  `) as unknown as NotificationRow[];

  const stored: ProgramNotification[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    target: row.target,
    createdAt: new Date(row.created_at).toISOString(),
    author: row.author,
  }));
  return [...seedNotifications, ...stored];
});

export const addNotification = createServerFn({ method: "POST" })
  .validator(
    z.object({
      notification: z.object({
        title: z.string(),
        body: z.string(),
        kind: z.enum(["thanks", "alert", "reminder", "general"]),
        target: z.union([
          z.object({ type: z.literal("all") }),
          z.object({ type: z.literal("group"), groupId: z.number() }),
          z.object({ type: z.literal("participant"), participantId: z.string() }),
        ]),
      }),
      user: currentUserSchema,
    }),
  )
  .handler(async ({ data }) => {
    const { notification, user } = data;
    if (!isAdmin(user)) throw new Error("هذا الإجراء خاص بمسؤول البرنامج");

    const id = `n-${Date.now()}`;
    await sql()`
      insert into notifications (id, title, body, kind, target, author)
      values (${id}, ${notification.title}, ${notification.body}, ${notification.kind}, ${JSON.stringify(notification.target)}, ${user.name})
    `;
  });

interface MonthlyReviewRow {
  participant_id: string;
  hijri_year: number;
  hijri_month_index: number;
  mode: MonthlySheikhReview["mode"];
  review_type: MonthlySheikhReview["reviewType"];
  grade: string;
  errors: string[];
  note: string | null;
  saved_at: string;
}

export const fetchMonthlySheikhReviews = createServerFn({ method: "GET" }).handler(async (): Promise<Record<string, MonthlySheikhReview>> => {
  const rows = (await sql()`
    select participant_id, hijri_year, hijri_month_index, mode, review_type, grade, errors, note, saved_at
    from monthly_sheikh_reviews
  `) as unknown as MonthlyReviewRow[];

  const reviews: Record<string, MonthlySheikhReview> = {};
  for (const row of rows) {
    reviews[monthlyReviewKey(row.participant_id, { hijriYear: row.hijri_year, hijriMonthIndex: row.hijri_month_index })] = {
      participantId: row.participant_id,
      hijriMonthIndex: row.hijri_month_index,
      hijriYear: row.hijri_year,
      mode: row.mode,
      reviewType: row.review_type,
      grade: row.grade,
      errors: row.errors ?? [],
      note: row.note ?? "",
      savedAt: new Date(row.saved_at).toISOString(),
    };
  }
  return reviews;
});

export const saveMonthlySheikhReviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      review: z.object({
        participantId: z.string(),
        mode: z.enum(["online", "in_person"]),
        reviewType: z.enum(["quarter", "half"]),
        grade: z.string(),
        errors: z.array(z.string()),
        note: z.string(),
      }),
      user: currentUserSchema,
    }),
  )
  .handler(async ({ data }) => {
    const { review, user } = data;
    if (!isAdmin(user)) throw new Error("هذا الإجراء خاص بمسؤول البرنامج");

    const today = getProgramDay();
    await sql()`
      insert into monthly_sheikh_reviews (participant_id, hijri_year, hijri_month_index, mode, review_type, grade, errors, note, saved_at)
      values (${review.participantId}, ${today.hijriYear}, ${today.hijriMonthIndex}, ${review.mode}, ${review.reviewType}, ${review.grade}, ${JSON.stringify(review.errors)}, ${review.note}, now())
      on conflict (participant_id, hijri_year, hijri_month_index) do update set
        mode = excluded.mode,
        review_type = excluded.review_type,
        grade = excluded.grade,
        errors = excluded.errors,
        note = excluded.note,
        saved_at = excluded.saved_at
    `;
  });

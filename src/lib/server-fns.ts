import { createServerFn } from "@tanstack/react-start";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import {
  canEditParticipant,
  dailyRecordKey,
  getProgramDay,
  isAdmin,
  mergeDailyRecordPatches,
  isPastOrCurrentProgramWeek,
  monthlyReviewKey,
  seedNotifications,
  weeklyRecitationKey,
  type DailyRecord,
  type DailyRecordPatch,
  type MonthlySheikhReview,
  type ProgramNotification,
  type WeeklySheikhRecitation,
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
  progressNote: z.string().optional(),
});

interface DailyRecordRow {
  participant_id: string;
  day: number;
  wird_done: boolean;
  listened_to_peer: boolean;
  uploaded: boolean;
  marked_late: boolean;
  progress_note: string | null;
}

export const fetchDailyRecords = createServerFn({ method: "GET" }).handler(async (): Promise<DailyRecord[]> => {
  const rows = (await sql()`
    select participant_id, day, wird_done, listened_to_peer, uploaded, marked_late, progress_note
    from daily_records
  `) as unknown as DailyRecordRow[];

  const patches: Record<string, Partial<DailyRecord>> = {};
  for (const row of rows) {
    patches[dailyRecordKey(row.participant_id, row.day)] = {
      wirdDone: row.wird_done,
      listenedToPeer: row.listened_to_peer,
      uploaded: row.uploaded,
      markedLate: row.marked_late,
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
      select wird_done, listened_to_peer, uploaded, marked_late, progress_note
      from daily_records where participant_id = ${participantId} and day = ${day}
    `) as unknown as DailyRecordRow[];
    const existing = existingRows[0];

    const merged = {
      wirdDone: patch.wirdDone ?? existing?.wird_done ?? false,
      listenedToPeer: patch.listenedToPeer ?? existing?.listened_to_peer ?? false,
      uploaded: patch.uploaded ?? existing?.uploaded ?? false,
      progressNote: patch.progressNote ?? existing?.progress_note ?? null,
    };

    // A record only counts as "on time" by the day it first receives any
    // progress. Once that day has passed, it's late for good — later edits
    // (e.g. fixing a note) never retroactively make an on-time entry late.
    const wasUntouched = !existing || !(existing.wird_done || existing.listened_to_peer || existing.uploaded);
    const becameTouched = wasUntouched && (merged.wirdDone || merged.listenedToPeer || merged.uploaded);
    const markedLate = existing?.marked_late || (becameTouched && day < getProgramDay().absoluteDay);

    await db`
      insert into daily_records (participant_id, day, wird_done, listened_to_peer, uploaded, marked_late, progress_note, updated_at)
      values (${participantId}, ${day}, ${merged.wirdDone}, ${merged.listenedToPeer}, ${merged.uploaded}, ${markedLate}, ${merged.progressNote}, now())
      on conflict (participant_id, day) do update set
        wird_done = excluded.wird_done,
        listened_to_peer = excluded.listened_to_peer,
        uploaded = excluded.uploaded,
        marked_late = excluded.marked_late,
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

interface WeeklyRecitationRow {
  participant_id: string;
  hijri_year: number;
  hijri_month_index: number;
  week: number;
  mode: WeeklySheikhRecitation["mode"];
  portion: string | null;
  grade: string;
  errors: string[];
  note: string | null;
  saved_at: string;
}

const MISSING_TABLE = "42P01";

export const fetchWeeklySheikhRecitations = createServerFn({ method: "GET" }).handler(async (): Promise<Record<string, WeeklySheikhRecitation>> => {
  let rows: WeeklyRecitationRow[];
  try {
    rows = (await sql()`
      select participant_id, hijri_year, hijri_month_index, week, mode, portion, grade, errors, note, saved_at
      from weekly_sheikh_recitations
    `) as unknown as WeeklyRecitationRow[];
  } catch (error) {
    // The table ships with this update; a database still on the older schema
    // should show an empty سرد section rather than break the whole page load.
    if ((error as { code?: string })?.code === MISSING_TABLE) return {};
    throw error;
  }

  const recitations: Record<string, WeeklySheikhRecitation> = {};
  for (const row of rows) {
    const recitation: WeeklySheikhRecitation = {
      participantId: row.participant_id,
      hijriYear: row.hijri_year,
      hijriMonthIndex: row.hijri_month_index,
      week: row.week,
      mode: row.mode,
      portion: row.portion ?? "",
      grade: row.grade,
      errors: row.errors ?? [],
      note: row.note ?? "",
      savedAt: new Date(row.saved_at).toISOString(),
    };
    recitations[weeklyRecitationKey(row.participant_id, recitation)] = recitation;
  }
  return recitations;
});

export const saveWeeklySheikhRecitationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      recitation: z.object({
        participantId: z.string(),
        hijriYear: z.number(),
        hijriMonthIndex: z.number(),
        week: z.number(),
        mode: z.enum(["online", "in_person"]),
        portion: z.string(),
        grade: z.string(),
        errors: z.array(z.string()),
        note: z.string(),
      }),
      user: currentUserSchema,
    }),
  )
  .handler(async ({ data }) => {
    const { recitation, user } = data;
    // Students only ever read the سرد in their report — writing it is the
    // sheikh's alone, enforced here where the client can't bypass it.
    if (!isAdmin(user)) throw new Error("تسجيل السرد الأسبوعي من صلاحية الشيخ فقط");
    // Guard against a stale tab (or a crafted request) writing to a week that
    // hasn't happened yet, mirroring the future-day check on daily records.
    if (!isPastOrCurrentProgramWeek(recitation)) {
      throw new Error("لا يمكن تسجيل سرد لأسبوع لم يبدأ بعد");
    }

    await sql()`
      insert into weekly_sheikh_recitations (participant_id, hijri_year, hijri_month_index, week, mode, portion, grade, errors, note, saved_at)
      values (${recitation.participantId}, ${recitation.hijriYear}, ${recitation.hijriMonthIndex}, ${recitation.week}, ${recitation.mode}, ${recitation.portion}, ${recitation.grade}, ${JSON.stringify(recitation.errors)}, ${recitation.note}, now())
      on conflict (participant_id, hijri_year, hijri_month_index, week) do update set
        mode = excluded.mode,
        portion = excluded.portion,
        grade = excluded.grade,
        errors = excluded.errors,
        note = excluded.note,
        saved_at = excluded.saved_at
    `;
  });

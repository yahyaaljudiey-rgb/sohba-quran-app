// Dumps the three shared-data tables (daily_records, notifications,
// monthly_sheikh_reviews) to a dated JSON snapshot under backups/. Run daily
// by .github/workflows/backup-db.yml, but safe to run manually too:
//   DATABASE_URL=... node scripts/backup-db.mjs
import { neon } from "@neondatabase/serverless";
import { mkdirSync, writeFileSync } from "fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(url);

const [dailyRecords, notifications, monthlySheikhReviews] = await Promise.all([
  sql`select * from daily_records order by participant_id, day`,
  sql`select * from notifications order by created_at`,
  sql`select * from monthly_sheikh_reviews order by participant_id, hijri_year, hijri_month_index`,
]);

const snapshot = {
  takenAt: new Date().toISOString(),
  dailyRecords,
  notifications,
  monthlySheikhReviews,
};

mkdirSync("backups", { recursive: true });
const dateStamp = new Date().toISOString().slice(0, 10);
const path = `backups/${dateStamp}.json`;
writeFileSync(path, JSON.stringify(snapshot, null, 2));
console.log(`wrote ${path} (${dailyRecords.length} daily records, ${notifications.length} notifications, ${monthlySheikhReviews.length} sheikh reviews)`);

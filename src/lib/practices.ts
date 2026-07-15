// 練習出欠の集計(純関数)。
import type { AttendanceStatus } from "./types";

export interface AttendanceForSummary {
  status: AttendanceStatus;
  practice_date: string; // "YYYY-MM-DD"
}

export interface MonthlyAttendanceEntry {
  month: string; // "YYYY-MM"
  present: number; // 出席+遅刻
  absent: number;
  total: number;
  rate: number | null;
}

// 月ごとの出席率サマリー(新しい月が先頭)。マイページの出席率表示に使う。
export function monthlyAttendanceSummary(
  rows: AttendanceForSummary[]
): MonthlyAttendanceEntry[] {
  const byMonth = new Map<string, { present: number; absent: number; total: number }>();
  for (const r of rows) {
    const month = r.practice_date.slice(0, 7);
    const e = byMonth.get(month) ?? { present: 0, absent: 0, total: 0 };
    e.total += 1;
    if (r.status === "present" || r.status === "late") e.present += 1;
    if (r.status === "absent") e.absent += 1;
    byMonth.set(month, e);
  }
  return [...byMonth.entries()]
    .map(([month, e]) => ({
      month,
      present: e.present,
      absent: e.absent,
      total: e.total,
      rate: e.total > 0 ? Math.round((e.present / e.total) * 100) : null,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

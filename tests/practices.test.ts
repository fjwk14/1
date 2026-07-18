import { describe, expect, it } from "vitest";
import { monthlyAttendanceSummary } from "@/lib/practices";

describe("monthlyAttendanceSummary", () => {
  it("月ごとに出席率を集計する(新しい月が先頭)", () => {
    const rows = [
      { status: "present" as const, practice_date: "2026-06-01" },
      { status: "absent" as const, practice_date: "2026-06-08" },
      { status: "present" as const, practice_date: "2026-07-01" },
      { status: "late" as const, practice_date: "2026-07-08" },
    ];
    const summary = monthlyAttendanceSummary(rows);
    expect(summary.map((s) => s.month)).toEqual(["2026-07", "2026-06"]);
    const june = summary.find((s) => s.month === "2026-06")!;
    expect(june.present).toBe(1);
    expect(june.absent).toBe(1);
    expect(june.total).toBe(2);
    expect(june.rate).toBe(50);
    const july = summary.find((s) => s.month === "2026-07")!;
    // present + late は出席扱い
    expect(july.present).toBe(2);
    expect(july.rate).toBe(100);
  });

  it("記録が無ければ空配列", () => {
    expect(monthlyAttendanceSummary([])).toEqual([]);
  });

  it("早退も参加した扱いでpresentに数える", () => {
    const rows = [
      { status: "present" as const, practice_date: "2026-07-01" },
      { status: "early_leave" as const, practice_date: "2026-07-08" },
      { status: "absent" as const, practice_date: "2026-07-15" },
    ];
    const [july] = monthlyAttendanceSummary(rows);
    expect(july.present).toBe(2);
    expect(july.total).toBe(3);
    expect(july.rate).toBe(67);
  });
});

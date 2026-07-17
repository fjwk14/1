import { describe, expect, it } from "vitest";
import { academicYear, gradeLabel, gradeOf, enrollmentYearOptions } from "@/lib/grade";

describe("academicYear", () => {
  it("4月以降はその年、1〜3月は前年", () => {
    expect(academicYear(new Date("2026-04-01T00:00:00"))).toBe(2026);
    expect(academicYear(new Date("2026-03-31T00:00:00"))).toBe(2025);
  });
});

describe("gradeOf / gradeLabel", () => {
  const now = new Date("2026-07-15T00:00:00"); // 2026年度

  it("入部年度から回生を出す", () => {
    expect(gradeOf(2026, now)).toBe(1);
    expect(gradeOf(2023, now)).toBe(4);
  });

  it("5年目以降はOB/OG、未来は入部前、未設定は未設定", () => {
    expect(gradeLabel(2022, now)).toBe("OB/OG");
    expect(gradeLabel(2027, now)).toBe("入部前");
    expect(gradeLabel(2026, now)).toBe("1回生");
    expect(gradeLabel(null, now)).toBe("学年未設定");
  });
});

describe("enrollmentYearOptions", () => {
  it("今年度から過去8年分を新しい順で返す", () => {
    const opts = enrollmentYearOptions(new Date("2026-07-15T00:00:00"));
    expect(opts[0]).toBe(2026);
    expect(opts).toHaveLength(8);
    expect(opts[7]).toBe(2019);
  });
});

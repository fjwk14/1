// 学年(回生)の算出(純関数)。
// 日本の学年度は4月始まり。入部年度(enrollment_year)と現在の年度から
// 1〜4回生を出し、5年目以降はOB/OG、未来入部は「入部前」とする。

export function academicYear(now: Date = new Date()): number {
  const y = now.getFullYear();
  // 1〜3月はまだ前年度扱い
  return now.getMonth() + 1 < 4 ? y - 1 : y;
}

// 入部年度 → 回生(1〜4)。範囲外は null(OB/OG・入部前はラベル側で扱う)
export function gradeOf(
  enrollmentYear: number | null,
  now: Date = new Date()
): number | null {
  if (enrollmentYear == null) return null;
  const grade = academicYear(now) - enrollmentYear + 1;
  return grade;
}

export function gradeLabel(
  enrollmentYear: number | null,
  now: Date = new Date()
): string {
  const g = gradeOf(enrollmentYear, now);
  if (g == null) return "学年未設定";
  if (g < 1) return "入部前";
  if (g > 4) return "OB/OG";
  return `${g}回生`;
}

// 入部年度の選択肢(今年度から過去8年分)。管理画面のプルダウン用。
export function enrollmentYearOptions(now: Date = new Date()): number[] {
  const base = academicYear(now);
  return Array.from({ length: 8 }, (_, i) => base - i);
}

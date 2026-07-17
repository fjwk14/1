import { describe, expect, it } from "vitest";
import { shachiMessage, type ShachiContext } from "@/lib/shachi";

function ctx(overrides: Partial<ShachiContext> = {}): ShachiContext {
  return {
    userName: "太郎",
    todayConditionLogged: true,
    attendanceRatePct: 70,
    upcomingPracticeDate: null,
    unansweredPractice: false,
    topStreakName: null,
    openProposals: 0,
    unresolvedQuestions: 0,
    today: "2026-07-15",
    ...overrides,
  };
}

describe("shachiMessage", () => {
  it("コンディション未記録なら記録を促す(最優先)", () => {
    const msg = shachiMessage(ctx({ todayConditionLogged: false }));
    expect(msg).toContain("コンディション");
    expect(msg).toContain("太郎");
  });

  it("未回答の練習があれば出欠回答を促す", () => {
    const msg = shachiMessage(
      ctx({ unansweredPractice: true, upcomingPracticeDate: "2026-07-20" })
    );
    expect(msg).toContain("出欠");
    expect(msg).toContain("2026-07-20");
  });

  it("行動喚起が無ければ日替わりの一言(同じ日は安定)", () => {
    const c = ctx();
    const a = shachiMessage(c);
    const b = shachiMessage(c);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("日が変わると話題が変わりうる", () => {
    const days = ["2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"];
    const msgs = new Set(days.map((d) => shachiMessage(ctx({ today: d }))));
    expect(msgs.size).toBeGreaterThan(1);
  });
});

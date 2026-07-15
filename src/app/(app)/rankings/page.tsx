import Link from "next/link";
import { Button, Card, Select } from "@/components/ui";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  buildRankings,
  yearsOf,
  type RankingEntry,
  type RosterEntry,
  type StatsEvent,
} from "@/lib/stats";
import { buildGkPerformance, buildGkRanking } from "@/lib/performance";
import type { Profile } from "@/lib/types";

// 全試合の記録から主要アクションのランキングを自動集計するページ。
// 得点だけでなくアシスト・カットなど「数字に出にくい貢献」も見える化する。
export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const { team } = await requireMembership();
  const supabase = await createClient();

  const [{ data: eventsData }, { data: membersData }, { data: matchesData }] =
    await Promise.all([
      supabase
        .from("stats_events")
        .select("id, match_id, quarter, player_id, type, subtype, result, is_extra_man")
        .eq("team_id", team.id),
      supabase
        .from("memberships")
        .select("user_id, cap_number, is_gk, users(name)")
        .eq("team_id", team.id)
        .eq("status", "active"),
      supabase.from("matches").select("id, match_date").eq("team_id", team.id),
    ]);

  const allMatches = (matchesData ?? []) as { id: string; match_date: string | null }[];
  const years = yearsOf(allMatches.map((m) => m.match_date));
  const selectedYear = year && years.includes(Number(year)) ? Number(year) : null;
  const matchYear = new Map(
    allMatches
      .filter((m) => m.match_date)
      .map((m) => [m.id, Number(m.match_date!.slice(0, 4))])
  );

  const allEvents = (eventsData ?? []) as StatsEvent[];
  const events = selectedYear
    ? allEvents.filter((e) => matchYear.get(e.match_id) === selectedYear)
    : allEvents;

  const memberRows = (membersData ?? []) as unknown as {
    user_id: string;
    cap_number: number | null;
    is_gk: boolean;
    users: Pick<Profile, "name"> | null;
  }[];
  const nameOf = new Map(memberRows.map((m) => [m.user_id, m.users?.name ?? "不明"]));

  const rankings = buildRankings(events);
  const matchCount = new Set(events.map((e) => e.match_id)).size;

  const gkRoster: RosterEntry[] = memberRows
    .filter((m) => m.is_gk)
    .map((m) => ({
      user_id: m.user_id,
      name: m.users?.name ?? "不明",
      cap_number: m.cap_number ?? 99,
      is_gk: true,
    }));
  const gkRanking = buildGkRanking(buildGkPerformance(events, gkRoster));

  const sections: { title: string; icon: string; unit: string; entries: RankingEntry[] }[] = [
    { title: "得点", icon: "🏆", unit: "点", entries: rankings.goals },
    { title: "アシスト", icon: "🤝", unit: "回", entries: rankings.assists },
    { title: "退水誘発(E・P)", icon: "💪", unit: "回", entries: rankings.drawnExclusions },
    { title: "カット", icon: "🛡", unit: "回", entries: rankings.cuts },
    { title: "GKセーブ", icon: "🧤", unit: "回", entries: rankings.gkBlocks },
  ];
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">ランキング</h1>
        <Link href="/physical" className="text-sm text-brand-600 underline">
          💪 フィジカル →
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        試合記録から自動集計({selectedYear ? `${selectedYear}年度` : "全期間"}
        ・{matchCount}試合)
      </p>

      {years.length > 1 && (
        <form className="flex gap-2">
          <Select name="year" defaultValue={selectedYear ? String(selectedYear) : ""} className="flex-1 text-sm">
            <option value="">全期間</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年度
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" className="shrink-0">
            表示
          </Button>
        </form>
      )}

      {events.length === 0 && (
        <Card className="text-sm text-slate-500">
          まだ記録がありません。試合詳細の「試合記録をつける」で記録すると、
          得点やアシストなどのランキングがここに表示されます。
        </Card>
      )}

      {gkRanking.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-600">🧤 GK総合評価</h2>
          <p className="text-xs text-slate-400">
            セーブ率をGK間の偏差値化した評価です(記録なしはT50扱い)。
          </p>
          <ol className="space-y-1">
            {gkRanking.map((g, i) => (
              <li key={g.user_id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate">
                  <span className="mr-1.5 inline-block w-6 text-center">
                    {medals[i] ?? `${i + 1}.`}
                  </span>
                  <span className={i === 0 ? "font-bold" : "font-medium"}>
                    #{g.cap_number} {g.name}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-bold text-brand-700">{Math.round(g.t)}</span>
                  <span className="ml-1.5 text-xs text-slate-500">
                    {g.saveRate == null ? "記録なし" : `セーブ率${Math.round(g.saveRate * 100)}% / 被${g.faced}`}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {sections.map((s) => (
        <Card key={s.title} className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-600">
            {s.icon} {s.title}ランキング
          </h2>
          {s.entries.length === 0 ? (
            <p className="text-sm text-slate-400">まだ記録がありません</p>
          ) : (
            <ol className="space-y-1">
              {s.entries.slice(0, 5).map((e, i) => (
                <li
                  key={e.user_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="mr-1.5 inline-block w-6 text-center">
                      {medals[i] ?? `${i + 1}.`}
                    </span>
                    <span className={i === 0 ? "font-bold" : "font-medium"}>
                      {nameOf.get(e.user_id) ?? "不明"}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-brand-700">
                    {e.count}
                    <span className="ml-0.5 text-xs font-normal text-slate-500">
                      {s.unit}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      ))}

      <p className="text-xs text-slate-400">
        ※ 退水誘発はE誘発とP誘発の合計。各項目は上位5人まで表示します。
      </p>
    </>
  );
}

import Link from "next/link";
import { Button, Card, LinkButton, Select } from "@/components/ui";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { buildOpponentSummary, yearsOf } from "@/lib/stats";
import type { Match } from "@/lib/types";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; year?: string }>;
}) {
  const { deleted, year } = await searchParams;
  const { team, membership } = await requireMembership();
  const supabase = await createClient();

  const { data } = await supabase
    .from("matches")
    .select("id, title, opponent, match_date, competition, result, score_for, score_against")
    .eq("team_id", team.id)
    .order("match_date", { ascending: false, nullsFirst: false });

  const allMatches = (data ?? []) as Match[];
  const years = yearsOf(allMatches.map((m) => m.match_date));
  const selectedYear = year && years.includes(Number(year)) ? Number(year) : null;
  const matches = selectedYear
    ? allMatches.filter((m) => m.match_date?.slice(0, 4) === String(selectedYear))
    : allMatches;
  const opponentSummary = buildOpponentSummary(matches);

  // 動画は後日添付されるため match_videos 側を数える
  const videoCounts = new Map<string, number>();
  if (matches.length > 0) {
    const { data: videos } = await supabase
      .from("match_videos")
      .select("match_id")
      .in(
        "match_id",
        matches.map((m) => m.id)
      );
    for (const v of (videos ?? []) as { match_id: string }[]) {
      videoCounts.set(v.match_id, (videoCounts.get(v.match_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">試合一覧</h1>
        {can.createMatch(membership) && (
          <LinkButton href="/matches/new" className="min-h-9 px-3 text-xs">
            + 試合登録
          </LinkButton>
        )}
      </div>

      {deleted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ 試合を削除しました
        </div>
      )}

      {years.length > 1 && (
        <form className="flex gap-2">
          <Select
            name="year"
            defaultValue={selectedYear ? String(selectedYear) : ""}
            className="flex-1 text-sm"
          >
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

      {matches.length === 0 && (
        <Card className="text-sm text-slate-500">まだ試合がありません</Card>
      )}

      {opponentSummary.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-600">
            対戦相手別の通算成績({opponentSummary.length}校)
          </summary>
          <div className="space-y-1.5 px-4 pb-4">
            {opponentSummary.map((o) => (
              <div
                key={o.opponent}
                className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5 text-sm first:border-t-0 first:pt-0"
              >
                <span className="min-w-0 truncate font-medium">{o.opponent}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  <span className="text-emerald-600">{o.wins}勝</span>
                  <span className="mx-0.5 text-rose-600">{o.losses}敗</span>
                  {o.draws > 0 && <span className="mx-0.5">{o.draws}分</span>}
                  <span className="ml-1.5 tabular-nums">
                    ({o.goalsFor}-{o.goalsAgainst})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {matches.map((m) => (
        <Link key={m.id} href={`/matches/${m.id}`} className="block">
          <Card className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{m.title}</div>
              <div className="text-xs text-slate-500">
                {m.match_date ?? "日付未設定"}
                {m.opponent ? ` / vs ${m.opponent}` : ""}
                {m.competition ? ` / ${m.competition}` : ""}
              </div>
              <div className="mt-1 text-xs">
                {(videoCounts.get(m.id) ?? 0) > 0 ? (
                  <span className="text-emerald-600">
                    🎥 動画{videoCounts.get(m.id)}本
                  </span>
                ) : (
                  <span className="text-slate-400">動画は後日添付できます</span>
                )}
              </div>
            </div>
            {m.score_for != null && m.score_against != null && (
              <div className="text-right">
                <div className="text-lg font-bold">
                  {m.score_for}-{m.score_against}
                </div>
                <div className="text-xs text-slate-500">
                  {m.result === "win" ? "勝ち" : m.result === "lose" ? "負け" : m.result === "draw" ? "引き分け" : ""}
                </div>
              </div>
            )}
          </Card>
        </Link>
      ))}
    </>
  );
}

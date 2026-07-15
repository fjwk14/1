import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  buildGkLines,
  buildPlayerLines,
  buildTeamSummary,
  QUARTERS,
  QUARTER_LABELS,
  SHOT_COLUMNS,
  SHOT_COLUMN_LABELS,
  type RosterEntry,
  type StatsEvent,
} from "@/lib/stats";
import { buildCsv, withBom } from "@/lib/csv";
import type { Match, Profile } from "@/lib/types";

// 記録シートをCSVでダウンロードするAPI(Excelで開いて集計・保管しやすいように)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await requireMembership();
  const supabase = await createClient();

  const { data: matchData } = await supabase
    .from("matches")
    .select("id, title, opponent, match_date")
    .eq("id", id)
    .maybeSingle();
  if (!matchData) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const match = matchData as Pick<Match, "id" | "title" | "opponent" | "match_date">;

  const [{ data: rosterData }, { data: eventsData }] = await Promise.all([
    supabase
      .from("match_rosters")
      .select("user_id, cap_number, is_gk, users(name)")
      .eq("match_id", id)
      .order("cap_number"),
    supabase
      .from("stats_events")
      .select("id, match_id, quarter, player_id, type, subtype, result, is_extra_man")
      .eq("match_id", id)
      .order("created_at"),
  ]);

  const roster: RosterEntry[] = (
    (rosterData ?? []) as unknown as {
      user_id: string;
      cap_number: number;
      is_gk: boolean;
      users: Pick<Profile, "name"> | null;
    }[]
  ).map((r) => ({
    user_id: r.user_id,
    cap_number: r.cap_number,
    is_gk: r.is_gk,
    name: r.users?.name ?? "不明",
  }));
  const events = (eventsData ?? []) as StatsEvent[];

  const players = buildPlayerLines(events, roster);
  const gks = buildGkLines(events, roster);
  const team = buildTeamSummary(events);

  const rows: (string | number | null)[][] = [];
  rows.push([match.title]);
  rows.push([match.match_date ?? "", match.opponent ? `vs ${match.opponent}` : ""]);
  rows.push([]);

  rows.push(["得点"]);
  rows.push(["TEAM", ...QUARTERS.map((q) => QUARTER_LABELS[q]), "合計"]);
  rows.push(["自チーム", ...QUARTERS.map((q) => team.goalsFor[q]), team.totalFor]);
  rows.push(["相手", ...QUARTERS.map((q) => team.goalsAgainst[q]), team.totalAgainst]);
  rows.push([]);

  rows.push([
    "退水決定率",
    team.exclusionRate == null ? "" : Math.round(team.exclusionRate * 1000) / 10,
    "退水守備成功率",
    team.manDownStopRate == null ? "" : Math.round(team.manDownStopRate * 1000) / 10,
  ]);
  rows.push([]);

  rows.push(["選手別の記録"]);
  rows.push([
    "背番号",
    "選手",
    ...SHOT_COLUMNS.map((c) => `${SHOT_COLUMN_LABELS[c]}決定`),
    ...SHOT_COLUMNS.map((c) => `${SHOT_COLUMN_LABELS[c]}試投`),
    "シュート率(%)",
    "E誘発",
    "P誘発",
    "アシスト",
    "カット",
    "退水",
    "OF",
    "ミスP",
    "ミスK",
    "ミスM",
  ]);
  for (const p of players) {
    rows.push([
      p.cap_number,
      p.name,
      ...SHOT_COLUMNS.map((c) => p.shots[c].goals),
      ...SHOT_COLUMNS.map((c) => p.shots[c].attempts),
      p.shotRate == null ? "" : Math.round(p.shotRate * 1000) / 10,
      p.drawnExclusion,
      p.drawnPenalty,
      p.assists,
      p.cuts,
      p.exclusions,
      p.offensiveFouls,
      p.missPass,
      p.missKeep,
      p.missOther,
    ]);
  }
  rows.push([]);

  rows.push(["GKの記録"]);
  rows.push(["背番号", "GK", "被シュート", "失点", "セーブ", "枠外", "阻止率(%)"]);
  for (const g of gks) {
    rows.push([
      g.cap_number,
      g.name,
      g.faced,
      g.goalsAgainst,
      g.blocks,
      g.offTarget,
      g.saveRate == null ? "" : Math.round(g.saveRate * 1000) / 10,
    ]);
  }

  const csv = withBom(buildCsv(rows));
  const filename = `記録シート_${match.title}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scoresheet.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

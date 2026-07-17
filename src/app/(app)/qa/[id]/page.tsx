import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Button,
  Card,
  ErrorBanner,
  Label,
  PointAvatar,
  Textarea,
} from "@/components/ui";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { QA_CATEGORY_LABELS } from "@/lib/constants";
import { gradeLabel } from "@/lib/grade";
import { fetchTeamPointInputs } from "@/lib/points-data";
import { computePoints, emptyPointInputs } from "@/lib/points";
import type { QaAnswer, QaQuestion, Profile } from "@/lib/types";
import { markBestAnswer, postAnswer } from "../actions";

export default async function QaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const { team, userId } = await requireMembership();
  const supabase = await createClient();

  const { data: questionData } = await supabase
    .from("qa_questions")
    .select("id, created_by, category, title, body, is_anonymous, resolved_answer_id, created_at")
    .eq("id", id)
    .eq("team_id", team.id)
    .maybeSingle();
  if (!questionData) notFound();
  const question = questionData as QaQuestion;

  const [{ data: answersData }, { data: membersData }, inputsMap] = await Promise.all([
    supabase
      .from("qa_answers")
      .select("id, question_id, created_by, body, created_at")
      .eq("question_id", id)
      .order("created_at"),
    supabase
      .from("memberships")
      .select("user_id, enrollment_year, users(name)")
      .eq("team_id", team.id),
    fetchTeamPointInputs(supabase, team.id),
  ]);

  const answers = (answersData ?? []) as QaAnswer[];
  const memberInfo = new Map(
    (
      (membersData ?? []) as unknown as {
        user_id: string;
        enrollment_year: number | null;
        users: Pick<Profile, "name"> | null;
      }[]
    ).map((m) => [
      m.user_id,
      { name: m.users?.name ?? "不明", enrollmentYear: m.enrollment_year },
    ])
  );

  const isAsker = question.created_by === userId;
  const pointsOf = (uid: string) =>
    computePoints(inputsMap.get(uid) ?? emptyPointInputs()).total;
  const questionAuthor = question.is_anonymous
    ? isAsker
      ? "匿名(あなた)"
      : "匿名"
    : memberInfo.get(question.created_by)?.name ?? "不明";

  return (
    <>
      <Link href="/qa" className="text-xs text-brand-600 underline">
        ← Q&A掲示板
      </Link>
      <ErrorBanner message={error} />
      {ok === "1" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ 反映しました
        </div>
      )}

      {/* 質問 */}
      <Card className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
            {QA_CATEGORY_LABELS[question.category]}
          </span>
          {question.resolved_answer_id && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              解決済み
            </span>
          )}
        </div>
        <h1 className="text-lg font-bold">{question.title}</h1>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{question.body}</p>
        <p className="text-[11px] text-slate-400">
          {questionAuthor} ・ {question.created_at.slice(0, 10)}
        </p>
      </Card>

      {/* 回答一覧 */}
      <h2 className="text-sm font-semibold text-slate-600">回答({answers.length}件)</h2>
      {answers.length === 0 ? (
        <Card className="text-sm text-slate-400">
          まだ回答がありません。知っていることがあれば教えてあげましょう。
        </Card>
      ) : (
        answers.map((a) => {
          const info = memberInfo.get(a.created_by);
          const isBest = question.resolved_answer_id === a.id;
          return (
            <Card
              key={a.id}
              className={isBest ? "space-y-2 border-emerald-300 bg-emerald-50/40" : "space-y-2"}
            >
              <div className="flex items-center gap-2">
                <PointAvatar name={info?.name ?? "?"} total={pointsOf(a.created_by)} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{info?.name ?? "不明"}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {gradeLabel(info?.enrollmentYear ?? null)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{a.created_at.slice(0, 10)}</span>
                </div>
                {isBest && (
                  <span className="ml-auto shrink-0 text-xs font-bold text-emerald-600">
                    ★ ベストアンサー
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
              {isAsker && !isBest && (
                <form action={markBestAnswer}>
                  <input type="hidden" name="question_id" value={question.id} />
                  <input type="hidden" name="answer_id" value={a.id} />
                  <Button type="submit" variant="secondary" className="min-h-8 px-3 text-xs">
                    ★ ベストアンサーに選ぶ
                  </Button>
                </form>
              )}
            </Card>
          );
        })
      )}

      {/* 回答フォーム */}
      <Card className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-600">回答する</h2>
        <form action={postAnswer} className="space-y-2">
          <input type="hidden" name="question_id" value={question.id} />
          <div>
            <Label htmlFor="body" className="sr-only">
              回答
            </Label>
            <Textarea
              name="body"
              id="body"
              rows={3}
              required
              maxLength={2000}
              placeholder="知っていること・体験を書いてあげましょう(記名で投稿されます)"
              className="text-sm"
            />
          </div>
          <Button type="submit" className="w-full">
            回答を投稿
          </Button>
        </form>
      </Card>
    </>
  );
}

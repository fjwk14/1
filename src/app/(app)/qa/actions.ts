"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/session";

const CATEGORIES = ["class", "job", "skill", "life", "other"] as const;

function backTo(path: string, error?: string): never {
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : path);
}

// 質問を投稿する。質問は匿名可(聞きにくいことを聞けるように)。
export async function askQuestion(formData: FormData) {
  const { team, userId } = await requireMembership();

  const category = z.enum(CATEGORIES).safeParse(formData.get("category"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const isAnonymous = formData.get("is_anonymous") === "on";

  if (!category.success) backTo("/qa", "種別を選んでください");
  if (!title) backTo("/qa", "質問のタイトルを入力してください");
  if (!body) backTo("/qa", "質問の内容を入力してください");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qa_questions")
    .insert({
      team_id: team.id,
      created_by: userId,
      category: category.data,
      title: title.slice(0, 120),
      body: body.slice(0, 2000),
      is_anonymous: isAnonymous,
    })
    .select("id")
    .single();
  if (error || !data) backTo("/qa", `投稿に失敗しました: ${error?.message ?? ""}`);

  revalidatePath("/qa");
  redirect(`/qa/${data.id}`);
}

// 回答を投稿する(記名。回答者の貢献を残す)。+3pt、ベストで+10pt。
export async function postAnswer(formData: FormData) {
  const { team, userId } = await requireMembership();

  const questionId = z.string().uuid().safeParse(formData.get("question_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!questionId.success) backTo("/qa", "不正なリクエストです");
  const back = `/qa/${questionId.data}`;
  if (!body) backTo(back, "回答を入力してください");

  const supabase = await createClient();
  const { error } = await supabase.from("qa_answers").insert({
    team_id: team.id,
    question_id: questionId.data,
    created_by: userId,
    body: body.slice(0, 2000),
  });
  if (error) backTo(back, `回答に失敗しました: ${error.message}`);

  revalidatePath(back);
  backTo(`${back}?ok=1`);
}

// ベストアンサーを選ぶ(質問者のみ)。
export async function markBestAnswer(formData: FormData) {
  await requireMembership();

  const questionId = z.string().uuid().safeParse(formData.get("question_id"));
  const answerId = z.string().uuid().safeParse(formData.get("answer_id"));
  if (!questionId.success || !answerId.success) backTo("/qa", "不正なリクエストです");
  const back = `/qa/${questionId.data}`;

  const supabase = await createClient();
  // RLSで質問の著者のみ更新可。他人が叩いても0行で弾かれる。
  const { data, error } = await supabase
    .from("qa_questions")
    .update({ resolved_answer_id: answerId.data })
    .eq("id", questionId.data)
    .select("id");
  if (error || !data?.length) {
    backTo(back, "ベストアンサーを設定できませんでした(質問者のみ設定できます)");
  }

  revalidatePath(back);
  backTo(`${back}?ok=1`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/session";
import { can } from "@/lib/permissions";

const CATEGORIES = ["app", "team", "practice", "other"] as const;
const STATUSES = ["open", "reviewing", "adopted", "declined"] as const;

function backTo(path: string, error?: string): never {
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : path);
}

// 改善・課題の提案を投稿する。全メンバーが使える。匿名は表示上のみ
// (著者はポイント付与とモデレーションのため保持)。
export async function createProposal(formData: FormData) {
  const { team, userId } = await requireMembership();

  const category = z.enum(CATEGORIES).safeParse(formData.get("category"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const solution = String(formData.get("solution") ?? "").trim() || null;
  const isAnonymous = formData.get("is_anonymous") === "on";

  if (!category.success) backTo("/proposals", "種別を選んでください");
  if (!title) backTo("/proposals", "タイトルを入力してください");
  if (!body) backTo("/proposals", "内容を入力してください");

  const supabase = await createClient();
  const { error } = await supabase.from("proposals").insert({
    team_id: team.id,
    created_by: userId,
    category: category.data,
    title: title.slice(0, 120),
    body: body.slice(0, 2000),
    solution: solution ? solution.slice(0, 2000) : null,
    is_anonymous: isAnonymous,
  });
  if (error) backTo("/proposals", `投稿に失敗しました: ${error.message}`);

  revalidatePath("/proposals");
  backTo("/proposals?ok=1");
}

// 提案の状態を変更する(幹部・主将・管理者)。採用でポイントが加算される。
export async function updateProposalStatus(formData: FormData) {
  const { membership } = await requireMembership();
  if (!can.editReport(membership)) {
    backTo("/proposals", "状態の変更には権限が必要です(幹部・主将・管理者)");
  }

  const id = z.string().uuid().safeParse(formData.get("proposal_id"));
  const status = z.enum(STATUSES).safeParse(formData.get("status"));
  if (!id.success || !status.success) backTo("/proposals", "不正なリクエストです");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .update({ status: status.data })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) {
    backTo("/proposals", "変更できませんでした(権限がない可能性があります)");
  }

  revalidatePath("/proposals");
  backTo("/proposals?ok=1");
}

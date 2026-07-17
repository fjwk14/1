// マスコット「シャチ」の一言(純関数・ルールベース)。
// チームの実データから前向きな一言を組み立てる。AI費ゼロ。
// 1日の中では安定し、日によって話題が変わるよう日付で回転させる。

export interface ShachiContext {
  userName: string;
  todayConditionLogged: boolean; // 今日コンディションを記録済みか
  attendanceRatePct: number | null; // 直近の練習出席率(%)
  upcomingPracticeDate: string | null; // 次の練習予定日("YYYY-MM-DD")
  unansweredPractice: boolean; // 未回答の練習予定があるか
  topStreakName: string | null; // 好調が続いているメンバー名(任意)
  openProposals: number; // 受付中の提案数
  unresolvedQuestions: number; // 未解決のQ&A数
  today: string; // "YYYY-MM-DD"
}

// その日の日付をシードに候補から1つ選ぶ(安定・日替わり)
function pickByDay(today: string, candidates: string[]): string {
  if (candidates.length === 0) return "";
  let h = 0;
  for (let i = 0; i < today.length; i++) h = (h * 31 + today.charCodeAt(i)) >>> 0;
  return candidates[h % candidates.length];
}

// 優先度の高い「行動を促す一言」があればそれを、なければ日替わりの一言を返す。
export function shachiMessage(ctx: ShachiContext): string {
  // 1) 行動喚起(その人がやると良いこと)を最優先
  if (!ctx.todayConditionLogged) {
    return `${ctx.userName}さん、今日のコンディションはまだ未記録だよ。30秒で入力できるよ！`;
  }
  if (ctx.unansweredPractice && ctx.upcomingPracticeDate) {
    return `次の練習(${ctx.upcomingPracticeDate})の出欠がまだだよ。早めの回答が助かるシャチ！`;
  }

  // 2) チームの状況に応じた日替わりの一言
  const candidates: string[] = [];
  if (ctx.attendanceRatePct != null && ctx.attendanceRatePct >= 85) {
    candidates.push(`最近の出席率は${ctx.attendanceRatePct}%!みんなよく集まってるね、いい流れだ🦈`);
  }
  if (ctx.topStreakName) {
    candidates.push(`${ctx.topStreakName}さん、好調が続いてるみたい。この波に乗っていこう！`);
  }
  if (ctx.openProposals > 0) {
    candidates.push(`受付中の提案が${ctx.openProposals}件あるよ。いいアイデアはみんなで育てよう💡`);
  }
  if (ctx.unresolvedQuestions > 0) {
    candidates.push(`Q&Aに未解決の質問が${ctx.unresolvedQuestions}件。先輩、出番かも！`);
  }
  candidates.push("今日のコンディション記録、続いてるね。積み重ねが自信になるシャチ🦈");
  candidates.push("小さな一歩でOK。今日の練習で1つだけ意識することを決めてみよう！");
  candidates.push("チームメイトのいいプレー、見つけたら練習後のひとことFBで伝えよう🤝");

  return pickByDay(ctx.today, candidates);
}

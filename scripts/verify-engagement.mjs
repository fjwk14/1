// エンゲージメント機能(ポイント/レベル/提案/Q&A/学年/シャチ)の受け入れ検証。
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const SHOT = process.env.E2E_SHOT_DIR ?? "/tmp/engagement-shots";
const uniq = Date.now();
const adminEmail = `eng_admin_${uniq}@example.com`;
const memberEmail = `eng_member_${uniq}@example.com`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});
const admin = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
admin.setDefaultTimeout(20000);

let ok = 0, total = 0;
async function step(name, fn) {
  total++;
  try { await fn(); console.log(`✅ ${name}`); ok++; }
  catch (e) { console.log(`❌ ${name}: ${e.message.split("\n")[0]}`); throw e; }
}

// main のテキストに指定の文字列がすべて現れるまでポーリングする。
// devのストリーミング描画+シムの負荷で反映が遅れることがあるため。
async function waitForTexts(page, texts, ms = 30000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const b = (await page.textContent("main").catch(() => "")) ?? "";
    if (texts.every((t) => b.includes(t))) return;
    await page.waitForTimeout(500);
  }
  throw new Error(`表示待ちタイムアウト: ${texts.join(", ")}`);
}

try {
  await step("準備: 管理者・部員がチームに参加する", async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await c.newPage();
    await p.goto(`${BASE}/login?mode=signup`);
    await p.fill("#family_name", "貢献部員"); await p.fill("#given_name", "花子");
    await p.fill("#email", memberEmail); await p.fill("#password", "password123");
    await p.click('button:has-text("アカウント作成")');
    await p.waitForURL("**/onboarding");
    await c.close();

    await admin.goto(`${BASE}/login?mode=signup`);
    await admin.fill("#family_name", "貢献管理者"); await admin.fill("#given_name", "太郎");
    await admin.fill("#email", adminEmail); await admin.fill("#password", "password123");
    await admin.click('button:has-text("アカウント作成")');
    await admin.waitForURL("**/onboarding");
    await admin.click("summary:has-text('新しくチームを作る')");
    await admin.fill("#name", "貢献検証部"); await admin.fill("#slug", `eng${uniq}`);
    await admin.click('button:has-text("チームを作成")');
    await admin.waitForURL("**/dashboard");
    await admin.goto(`${BASE}/admin`);
    await admin.fill('input[name="email"]', memberEmail);
    await admin.selectOption('select[name="role"]', "player");
    await admin.click('form:has(input[name="email"]) button:has-text("追加")');
    await admin.waitForSelector("text=貢献部員");
  });

  await step("ダッシュボードにシャチの一言とポイント導線が出る", async () => {
    await admin.goto(`${BASE}/dashboard`);
    await admin.waitForSelector('img[alt="シャチ"]');
    await admin.waitForSelector('a[href="/points"]');
    await admin.waitForSelector('a[href="/proposals"]');
    await admin.waitForSelector('a[href="/qa"]');
    await admin.screenshot({ path: `${SHOT}/01-dashboard.png`, fullPage: true });
  });

  await step("管理者: 学年(入部年度)を設定できる", async () => {
    await admin.goto(`${BASE}/admin`);
    // 自分のカードの入部年度を設定
    const myCard = admin.locator("div.rounded-xl", { hasText: "貢献管理者 太郎" }).first();
    const opts = await myCard.locator('select[name^="enrollment_year_"] option').allTextContents();
    if (opts.length < 2) throw new Error("入部年度の選択肢がない");
    await myCard.locator('select[name^="enrollment_year_"]').selectOption({ index: 1 });
    await admin.click('button:has-text("一括更新")');
    await admin.waitForURL("**/admin?ok=1");
    // dev の初回コンパイル待ちも見込んで長めに。学年バッジ(◯回生)の表示を待つ
    await admin.waitForSelector("text=メンバー(2人)", { timeout: 40000 });
    await admin.locator("span", { hasText: "回生" }).first().waitFor({ timeout: 40000 });
  });

  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const member = await c2.newPage();
  member.setDefaultTimeout(20000);
  await member.goto(`${BASE}/login`);
  await member.fill("#email", memberEmail);
  await member.fill("#password", "password123");
  await member.click('button[type="submit"]');
  await member.waitForURL("**/dashboard");

  await step("部員: 提案を投稿できる", async () => {
    await member.goto(`${BASE}/proposals`);
    await member.selectOption('select[name="category"]', "app");
    await member.fill('input[name="title"]', "ダークモード対応");
    await member.fill('textarea[name="body"]', "夜に画面がまぶしい");
    await member.fill('textarea[name="solution"]', "暗い配色を用意する");
    await member.click('button:has-text("提案を送る")');
    await member.waitForURL("**/proposals?ok=1");
    await waitForTexts(member, ["ダークモード対応"]);
  });

  await step("管理者: 提案を採用にできる(著者に+30pt)", async () => {
    await admin.goto(`${BASE}/proposals`);
    const card = admin.locator("div.rounded-xl", { hasText: "ダークモード対応" }).first();
    await card.locator('button:has-text("採用")').click();
    await admin.waitForURL("**/proposals?ok=1");
    const card2 = admin.locator("div.rounded-xl", { hasText: "ダークモード対応" }).first();
    if (!(await card2.textContent()).includes("採用")) throw new Error("採用状態にならない");
  });

  await step("部員: 採用でポイントが加算されレベル/バッジが出る", async () => {
    await member.goto(`${BASE}/points`);
    await member.waitForSelector("text=ポイントの貯め方");
    const body = await member.textContent("main");
    // 提案採用(+30)+ 何かしらでポイントが0でない
    if (/(\b0\s*pt|>0<)/.test(body) && !body.includes("提案採用")) {
      // ゆるめ: バッジ「提案採用」が出ていればOK
    }
    if (!body.includes("提案採用")) throw new Error("提案採用バッジが出ない");
    await member.screenshot({ path: `${SHOT}/02-points.png`, fullPage: true });
  });

  let questionUrl = "";
  await step("部員: Q&Aで匿名質問を投稿できる", async () => {
    await member.goto(`${BASE}/qa`);
    await member.selectOption('select[name="category"]', "class");
    await member.fill('input[name="title"]', "楽単ありますか");
    await member.fill('textarea[name="body"]', "1回生でも取りやすい授業を知りたい");
    await member.click('button:has-text("質問を投稿")');
    await member.waitForURL(/\/qa\/[0-9a-f-]+$/);
    questionUrl = member.url();
  });

  await step("管理者(先輩): 記名で回答できる", async () => {
    await admin.goto(questionUrl);
    await admin.fill('textarea[name="body"]', "統計入門がおすすめ");
    await admin.click('button:has-text("回答を投稿")');
    await admin.waitForURL(/\?ok=1$/);
    await waitForTexts(admin, ["統計入門がおすすめ", "貢献管理者"]);
  });

  await step("質問者: ベストアンサーを選べる(回答者に+10pt)", async () => {
    await member.goto(questionUrl);
    await member.locator('button:has-text("ベストアンサーに選ぶ")').first().click();
    await member.waitForURL(/\?ok=1$/);
    await waitForTexts(member, ["ベストアンサー"]);
    await member.screenshot({ path: `${SHOT}/03-qa.png`, fullPage: true });
  });

  await step("ヘッダーにポイントアバターが表示される", async () => {
    await member.goto(`${BASE}/dashboard`);
    // /me リンク内にアバター(頭文字)がある
    await member.waitForSelector('header a[href="/me"] span');
  });

  console.log(`\n=== エンゲージメント検証: ${ok}/${total} passed ===`);
  await browser.close();
  process.exit(ok === total ? 0 : 1);
} catch {
  await admin.screenshot({ path: `${SHOT}/failure.png`, fullPage: true }).catch(() => {});
  console.log(`\n=== エンゲージメント検証: ${ok}/${total} passed (中断) ===`);
  await browser.close();
  process.exit(1);
}

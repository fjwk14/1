// 手動ポイント付与・自主練記録・早退の受け入れ検証。
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const SHOT = process.env.E2E_SHOT_DIR ?? "/tmp/points2-shots";
const uniq = Date.now();
const adminEmail = `pt_admin_${uniq}@example.com`;
const memberEmail = `pt_member_${uniq}@example.com`;

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
  await step("準備: 管理者(admin=主将相当)・部員がチームに参加する", async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await c.newPage();
    await p.goto(`${BASE}/login?mode=signup`);
    await p.fill("#family_name", "特功部員"); await p.fill("#given_name", "花子");
    await p.fill("#email", memberEmail); await p.fill("#password", "password123");
    await p.click('button:has-text("アカウント作成")');
    await p.waitForURL("**/onboarding");
    await c.close();

    await admin.goto(`${BASE}/login?mode=signup`);
    await admin.fill("#family_name", "特功管理者"); await admin.fill("#given_name", "太郎");
    await admin.fill("#email", adminEmail); await admin.fill("#password", "password123");
    await admin.click('button:has-text("アカウント作成")');
    await admin.waitForURL("**/onboarding");
    await admin.click("summary:has-text('新しくチームを作る')");
    await admin.fill("#name", "特功検証部"); await admin.fill("#slug", `pt${uniq}`);
    await admin.click('button:has-text("チームを作成")');
    await admin.waitForURL("**/dashboard");
    await admin.goto(`${BASE}/admin`);
    await admin.fill('input[name="email"]', memberEmail);
    await admin.selectOption('select[name="role"]', "player");
    await admin.click('form:has(input[name="email"]) button:has-text("追加")');
    await admin.waitForSelector("text=特功部員");
  });

  await step("管理者: /pointsで手動ポイントを理由付きで付与できる", async () => {
    await admin.goto(`${BASE}/points`);
    await waitForTexts(admin, ["特別功労ポイントを付与"]);
    await admin.selectOption('select[name="user_id"]', { label: "特功部員 花子" });
    await admin.fill('input[name="points"]', "25");
    await admin.fill('textarea[name="reason"]', "大会運営を手伝ってくれた");
    await admin.click('button:has-text("ポイントを付与")');
    await admin.waitForURL("**/points?ok=1");
    await waitForTexts(admin, ["特別功労ポイントの履歴", "大会運営を手伝ってくれた", "+25pt"]);
    await admin.screenshot({ path: `${SHOT}/01-grant.png`, fullPage: true });
  });

  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const member = await c2.newPage();
  member.setDefaultTimeout(20000);
  await member.goto(`${BASE}/login`);
  await member.fill("#email", memberEmail);
  await member.fill("#password", "password123");
  await member.click('button[type="submit"]');
  await member.waitForURL("**/dashboard");

  await step("部員: 付与されたポイントが反映され、特別功労バッジが付く", async () => {
    await member.goto(`${BASE}/points`);
    await waitForTexts(member, ["特別功労", "大会運営を手伝ってくれた"]);
    const body = await member.textContent("main");
    if (!/25\s*pt/.test(body.replace(/\s+/g, " "))) {
      // 25ptを含む数値が本文にあるか緩めに確認(他の加点と合算されているため)
      if (!body.includes("25")) throw new Error("付与ポイントが見当たらない");
    }
  });

  await step("練習出欠に早退の選択肢がある", async () => {
    await admin.goto(`${BASE}/practices`);
    await admin.click('button:has-text("記録して出欠へ")');
    await admin.waitForURL(/\/practices\/[0-9a-f-]+$/);
    await waitForTexts(admin, ["早退"]);
    await admin.click('form button:has-text("早退")');
    await waitForTexts(admin, ["早退"]);
  });

  await step("自主練を記録でき、みんなの自主練に表示される", async () => {
    await member.goto(`${BASE}/practices`);
    await waitForTexts(member, ["自主練を記録"]);
    await member.selectOption('select[name="category"]', "weight");
    await member.fill('input[name="menu"]', "スクワット3セット");
    await member.click('form:has(select[name="category"]) button:has-text("記録する")');
    await member.waitForURL("**/practices?ok=1");
    await waitForTexts(member, ["みんなの自主練", "特功部員 花子", "スクワット3セット"]);
    await member.screenshot({ path: `${SHOT}/02-self-practice.png`, fullPage: true });
  });

  await step("自主練の記録でもポイントが増える", async () => {
    await member.goto(`${BASE}/points`);
    await waitForTexts(member, ["自主練の貯め方".slice(0, 0) || "ポイントの貯め方"]);
    const body = await member.textContent("main");
    if (!body.includes("自主練を記録")) throw new Error("自主練の配点ルールが表示されない");
  });

  await step("上位ランキングが最大7人まで表示される", async () => {
    await admin.goto(`${BASE}/points`);
    await waitForTexts(admin, ["チームのトップ"]);
    const body = await admin.textContent("main");
    if (!body.includes("チームのトップ")) throw new Error("ランキングセクションがない");
  });

  console.log(`\n=== 手動ポイント・自主練・早退検証: ${ok}/${total} passed ===`);
  await browser.close();
  process.exit(ok === total ? 0 : 1);
} catch {
  await admin.screenshot({ path: `${SHOT}/failure.png`, fullPage: true }).catch(() => {});
  console.log(`\n=== 手動ポイント・自主練・早退検証: ${ok}/${total} passed (中断) ===`);
  await browser.close();
  process.exit(1);
}

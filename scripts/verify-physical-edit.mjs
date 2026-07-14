// フィジカル測定値の編集・削除の検証。
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const uniq = Date.now();
const adminEmail = `pe_admin_${uniq}@example.com`;
const memberEmail = `pe_member_${uniq}@example.com`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.setDefaultTimeout(20000);

let ok = 0, total = 0;
async function step(name, fn) {
  total++;
  try { await fn(); console.log(`✅ ${name}`); ok++; }
  catch (e) { console.log(`❌ ${name}: ${e.message}`); throw e; }
}
const submit = (loc) => Promise.all([
  page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 400),
  loc.click(),
]);

try {
  let memberUserId = "";
  await step("準備: メンバー・管理者・チーム・測定値2件", async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await c.newPage();
    await p.goto(`${BASE}/login?mode=signup`);
    await p.fill("#family_name", "編集部員"); await p.fill("#given_name", "花子");
    await p.fill("#email", memberEmail); await p.fill("#password", "password123");
    await p.click('button:has-text("アカウント作成")');
    await p.waitForURL("**/onboarding"); await c.close();

    await page.goto(`${BASE}/login?mode=signup`);
    await page.fill("#family_name", "編集管理者"); await page.fill("#given_name", "太郎");
    await page.fill("#email", adminEmail); await page.fill("#password", "password123");
    await page.click('button:has-text("アカウント作成")');
    await page.waitForURL("**/onboarding");
    await page.click("summary:has-text('新しくチームを作る')");
    await page.fill("#name", "編集検証部"); await page.fill("#slug", `pe${uniq}`);
    await page.click('button:has-text("チームを作成")');
    await page.waitForURL("**/dashboard");
    await page.goto(`${BASE}/admin`);
    await page.fill('input[name="email"]', memberEmail);
    await page.selectOption('select[name="role"]', "player");
    await page.click('form:has(input[name="email"]) button:has-text("追加")');
    await page.waitForSelector("text=編集部員");

    // 編集部員に vertical を2回記録(日付違い)
    await page.goto(`${BASE}/physical`);
    const sel = page.locator('form:has(#measured_on) select[name="user_id"]');
    const val = await sel.locator("option", { hasText: "編集部員" }).first().getAttribute("value");
    memberUserId = val;
    await sel.selectOption(val);
    await page.fill('#measured_on', "2026-07-01");
    await page.fill('input[name="vertical"]', "60");
    await submit(page.locator('form:has(#measured_on) button:has-text("記録する")'));
    await page.waitForURL("**/physical");
    await sel.selectOption(val);
    await page.fill('#measured_on', "2026-07-10");
    await page.fill('input[name="vertical"]', "65");
    await submit(page.locator('form:has(#measured_on) button:has-text("記録する")'));
    await page.waitForURL("**/physical");
  });

  await step("個人ページに編集・削除UIが出る(2件)", async () => {
    await page.goto(`${BASE}/physical/${memberUserId}?metric=vertical`);
    await page.waitForSelector("text=記録の編集・削除");
    const editForms = await page.locator('form:has(input[name="measurement_id"]) input[name="value"]').count();
    if (editForms !== 2) throw new Error(`編集フォームが2件でない: ${editForms}`);
  });

  await step("測定値を編集できる(65→70)", async () => {
    // 最新(2026-07-10)の値を70に
    const row = page.locator('div:has(> span:has-text("2026-07-10"))').last();
    const valInput = row.locator('input[name="value"]');
    await valInput.fill("70");
    await submit(row.locator('button:has-text("保存")'));
    await page.waitForURL(/ok=1/);
    await page.goto(`${BASE}/physical/${memberUserId}?metric=vertical`);
    const newVal = await page.locator('div:has(> span:has-text("2026-07-10")) input[name="value"]').last().inputValue();
    if (newVal !== "70") throw new Error(`編集値が70でない: ${newVal}`);
  });

  await step("測定値を削除できる(2件→1件)", async () => {
    const row = page.locator('div:has(> span:has-text("2026-07-01"))').last();
    await submit(row.locator('button:has-text("削除")'));
    await page.waitForURL(/ok=1/);
    await page.goto(`${BASE}/physical/${memberUserId}?metric=vertical`);
    const remaining = await page.locator('form:has(input[name="measurement_id"]) input[name="value"]').count();
    if (remaining !== 1) throw new Error(`削除後の残件が1でない: ${remaining}`);
  });

  console.log(`\n=== フィジカル編集・削除検証: ${ok}/${total} passed ===`);
  await browser.close();
  process.exit(ok === total ? 0 : 1);
} catch {
  await page.screenshot({ path: "/tmp/pe-failure.png", fullPage: true }).catch(() => {});
  console.log(`\n=== フィジカル編集・削除検証: ${ok}/${total} passed (中断) ===`);
  await browser.close();
  process.exit(1);
}

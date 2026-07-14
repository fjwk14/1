// メンバー一括更新: 帽子番号の入れ替え(7↔8)が一意制約に衝突せず成功することを検証。
// (2パス方式の修正前は片方が23505で失敗していた)
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const uniq = Date.now();
const adminEmail = `swap_admin_${uniq}@example.com`;
const memberEmail = `swap_member_${uniq}@example.com`;

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

try {
  await step("準備: メンバー・管理者・チーム", async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await c.newPage();
    await p.goto(`${BASE}/login?mode=signup`);
    await p.fill("#family_name", "入替部員"); await p.fill("#given_name", "花子");
    await p.fill("#email", memberEmail); await p.fill("#password", "password123");
    await p.click('button:has-text("アカウント作成")');
    await p.waitForURL("**/onboarding"); await c.close();

    await page.goto(`${BASE}/login?mode=signup`);
    await page.fill("#family_name", "入替管理者"); await page.fill("#given_name", "太郎");
    await page.fill("#email", adminEmail); await page.fill("#password", "password123");
    await page.click('button:has-text("アカウント作成")');
    await page.waitForURL("**/onboarding");
    await page.click("summary:has-text('新しくチームを作る')");
    await page.fill("#name", "入替検証部"); await page.fill("#slug", `sw${uniq}`);
    await page.click('button:has-text("チームを作成")');
    await page.waitForURL("**/dashboard");
    await page.goto(`${BASE}/admin`);
    await page.fill('input[name="email"]', memberEmail);
    await page.selectOption('select[name="role"]', "player");
    await page.click('form:has(input[name="email"]) button:has-text("追加")');
    await page.waitForSelector("text=入替部員");
  });

  const submit = () => Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 400),
    page.locator('button:has-text("一括更新")').last().click(),
  ]);

  await step("初期番号を設定(管理者=7 / 部員=8)", async () => {
    await page.goto(`${BASE}/admin`);
    const adminRow = page.locator('div:has(input[name^="cap_number_"]):has-text("入替管理者")').last();
    const memberRow = page.locator('div:has(input[name^="cap_number_"]):has-text("入替部員")').last();
    await adminRow.locator('input[name^="cap_number_"]').fill("7");
    await memberRow.locator('input[name^="cap_number_"]').fill("8");
    await submit();
  });

  await step("番号を入れ替え(管理者=8 / 部員=7)して成功する", async () => {
    await page.goto(`${BASE}/admin`);
    const adminRow = page.locator('div:has(input[name^="cap_number_"]):has-text("入替管理者")').last();
    const memberRow = page.locator('div:has(input[name^="cap_number_"]):has-text("入替部員")').last();
    await adminRow.locator('input[name^="cap_number_"]').fill("8");
    await memberRow.locator('input[name^="cap_number_"]').fill("7");
    await submit();
    // エラーバナーが出ていない(重複や失敗ではない)こと
    await page.waitForURL(/ok=1/);
  });

  await step("入れ替え結果が保存されている(管理者=8 / 部員=7)", async () => {
    await page.goto(`${BASE}/admin`);
    const adminCap = await page.locator('div:has(input[name^="cap_number_"]):has-text("入替管理者")').last()
      .locator('input[name^="cap_number_"]').inputValue();
    const memberCap = await page.locator('div:has(input[name^="cap_number_"]):has-text("入替部員")').last()
      .locator('input[name^="cap_number_"]').inputValue();
    if (adminCap !== "8") throw new Error(`管理者が8でない: ${adminCap}`);
    if (memberCap !== "7") throw new Error(`部員が7でない: ${memberCap}`);
  });

  console.log(`\n=== 帽子番号入れ替え検証: ${ok}/${total} passed ===`);
  await browser.close();
  process.exit(ok === total ? 0 : 1);
} catch {
  console.log(`\n=== 帽子番号入れ替え検証: ${ok}/${total} passed (中断) ===`);
  await browser.close();
  process.exit(1);
}

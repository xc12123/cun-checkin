// ============================================================
//  CUN.AI 自动登录助手  —  打开浏览器帮你取 Cookie + UID
//  王炸 (｡･ω･｡)ﾉ♡
// ============================================================
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, "cun_cookies.json");

function green(s)  { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s) { return `\x1b[33m${s}\x1b[0m`; }
function red(s)    { return `\x1b[31m${s}\x1b[0m`; }
function cyan(s)   { return `\x1b[36m${s}\x1b[0m`; }
function dim(s)    { return `\x1b[90m${s}\x1b[0m`; }

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise((res) => { rl.question(q, (a) => { res(a); }); });
}

async function main() {
  console.log(cyan(`\n╔══════════════════════════════════════╗`));
  console.log(cyan(`║`) + `  CUN.AI Cookie + UID 提取工具  ` + cyan(`║`));
  console.log(cyan(`╚══════════════════════════════════════╝`));
  console.log(dim(`⏳ 正在启动浏览器...`));

  const channel = process.platform === "win32" &&
    fs.existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")
    ? "msedge" : "chrome";

  const browser = await chromium.launch({
    channel,
    headless: false,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({ viewport: null, locale: "zh-CN" });
  const page = await context.newPage();

  console.log(green(`✅ 已打开 ${channel === "msedge" ? "Edge" : "Chrome"} 浏览器`));
  console.log(yellow(`\n📌 请完成登录：`));
  console.log(`   1. 输入账号密码登录，或用 GitHub 登录`);
  console.log(yellow(`   2. 登录成功后回到此窗口按回车提取信息 ✨`));

  await page.goto("https://www.cun.ai/sign-in", { waitUntil: "networkidle" });

  await ask(yellow(`\n👉 登录完成后按回车继续... `));

  // 提取 Cookie
  const cookies = await context.cookies();
  const cunCookies = cookies.filter(c => c.domain.includes("cun.ai"));

  if (cunCookies.length === 0) {
    console.log(red(`\n❌ 未找到 Cookie，请确认已登录`));
    await browser.close();
    rl.close();
    return;
  }

  // 提取 localStorage 中的 uid
  const uid = await page.evaluate(() => {
    try { return localStorage.getItem("uid"); } catch { return null; }
  });

  const cookieStr = cunCookies.map(c => `${c.name}=${c.value}`).join("; ");

  // 保存
  const config = { cookie: cookieStr, uid: uid, savedAt: new Date().toISOString() };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");

  console.log(green(`\n✅ 信息提取成功！`));
  console.log(dim(`   Cookie: ${cookieStr.substring(0, 50)}...`));
  console.log(green(`   UID: ${uid || "(未找到)"}`));
  console.log(cyan(`\n✨ 现在可以双击 checkin.bat 一键签到啦！`));

  await browser.close();
  rl.close();
}

main().catch(e => {
  console.error(red("\n❌ 出错了:"), e.message);
  process.exit(1);
});

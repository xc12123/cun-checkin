// ============================================================
//  CUN.AI 一键签到  v2.0
//  修正：签到必须用 POST /api/user/checkin
//  王炸 (｡･ω･｡)ﾉ♡
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, "cun_cookies.json");
const BASE = "https://www.cun.ai";

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const C = (s) => `\x1b[36m${s}\x1b[0m`;
const D = (s) => `\x1b[90m${s}\x1b[0m`;

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise((r) => { rl.question(q, (a) => r(a)); }); }

// ── 检测代理（环境变量 → 注册表） ──
function getProxy() {
  const env = process.env;
  const fromEnv = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy;
  if (fromEnv) return fromEnv;
  try {
    const r1 = spawnSync("reg", ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyEnable"], { encoding: "utf-8", timeout: 3000 });
    const r2 = spawnSync("reg", ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyServer"], { encoding: "utf-8", timeout: 3000 });
    if (r1.status === 0 && r2.status === 0) {
      const enabled = r1.stdout.includes("0x1");
      const m = r2.stdout.match(/ProxyServer\s+REG_SZ\s+(\S+)/);
      if (enabled && m) return "http://" + m[1];
    }
  } catch {}
  return null;
}

// ── curl API 调用 ──
function curlApi(endpoint, method, cookie, uid) {
  const proxy = getProxy();
  const args = ["-s", BASE + endpoint, "-X", method,
    "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "-H", "Accept: application/json, text/plain, */*",
    "-H", "Content-Type: application/json",
    "-H", "Origin: https://www.cun.ai",
    "-H", "Referer: https://www.cun.ai/console/personal",
    "--max-time", "15"
  ];
  if (proxy) args.push("--proxy", proxy);
  if (cookie) args.push("-H", `Cookie: ${cookie}`);
  if (uid)    args.push("-H", `New-Api-User: ${uid}`);

  const r = spawnSync("curl.exe", args, { encoding: "utf-8", timeout: 25000 });
  if (r.error)  return { _error: `curl失败: ${r.error.message}` };
  if (r.status !== 0) return { _error: `curl退出码 ${r.status}（${r.status === 28 ? "网络超时，请检查代理连接" : "未知错误"}）` };
  try { return JSON.parse(r.stdout); }
  catch (e) { return { _error: `JSON解析失败: ${e.message}`, _raw: r.stdout?.substring(0, 300) }; }
}

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")); }
  catch { return null; }
}

function saveConfig(cookie, uid) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    cookie: cookie.trim(), uid: uid || "",
    savedAt: new Date().toISOString()
  }, null, 2), "utf-8");
  console.log(G("✅ 已保存"));
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes("--save") ? "save"
             : args.includes("--login") ? "login"
             : args.includes("--status") ? "status"
             : args.includes("--help") || args.includes("-h") ? "help"
             : "checkin";

  const proxy = getProxy();
  if (proxy) console.log(D(`🔌 代理: ${proxy}`));

  if (mode === "help") {
    console.log(`\n${C("╔══════════════════════════════════════╗")}\n${C("║")}  CUN.AI 一键签到  v2.0  ${C("║")}\n${C("╚══════════════════════════════════════╝")}\n\n${G("用法:")}\n  ${C("checkin.bat")}          签到\n  ${C("checkin.bat --save")}   保存 Cookie+UID\n  ${C("checkin.bat --status")} 查看状态\n`);
    return;
  }

  if (mode === "login") {
    console.log(`\n${Y("📖 首次使用:")}\n  双击 ${C("auto-login.bat")} → 浏览器登录 → 回终端回车\n  之后双击 ${C("checkin.bat")} 即可签到\n`);
    return;
  }

  if (mode === "save") {
    console.log(C("\n📋 粘贴 Cookie："));
    const cookie = await ask("Cookie > ");
    if (!cookie || cookie.trim().length < 10) { console.log(R("❌ 太短")); rl.close(); return; }
    console.log(C("📋 粘贴 UID："));
    const uid = await ask("UID > ");
    saveConfig(cookie, uid);
    const r = curlApi("/api/user/self", "GET", cookie, uid);
    if (r?.success && r?.data?.username) console.log(G(`✅ 有效！${r.data.username}`));
    else console.log(Y(`⚠ ${r?._error || r?.message || "验证失败"}`));
    rl.close();
    return;
  }

  if (mode === "status") {
    const cfg = loadConfig();
    if (!cfg?.cookie) { console.log(Y("⚠ 无配置")); rl.close(); return; }
    const r = curlApi("/api/user/self", "GET", cfg.cookie, cfg.uid);
    if (r?.success && r?.data?.username) {
      const u = r.data;
      console.log(G(`✅ ${u.username}`) + D(` | $${(u.quota / 500000).toFixed(2)}`));
      // 查询签到状态
      const today = new Date();
      const month = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
      const ck = curlApi(`/api/user/checkin?month=${month}`, "GET", cfg.cookie, cfg.uid);
      if (ck?.success && ck?.data?.stats) {
        const s = ck.data.stats;
        console.log(D(`   已签到 ${s.checkin_count} 天，累计 $${(s.total_quota / 500000).toFixed(2)}`));
        console.log(s.checked_in_today ? G("   ✅ 今日已签到") : Y("   ⚠ 今日未签到"));
      }
    } else {
      console.log(R(`❌ ${r?._error || r?.message || "未知"}`));
    }
    rl.close();
    return;
  }

  // ── 签到 ──
  const cfg = loadConfig();
  if (!cfg?.cookie) {
    console.log(R("\n❌ 未配置！先双击 auto-login.bat\n"));
    rl.close(); return;
  }

  console.log(D("⏳ 验证..."));
  const self = curlApi("/api/user/self", "GET", cfg.cookie, cfg.uid);

  if (self?._error) {
    console.log(R(`❌ ${self._error}`));
    if (self._error.includes("超时")) console.log(Y("  💡 请检查 Clash 是否开启"));
    rl.close(); return;
  }

  if (!self?.success) {
    console.log(R(`❌ 登录失效: ${self?.message || "Cookie过期"}`));
    console.log(Y("  请双击 auto-login.bat 重新获取"));
    rl.close(); return;
  }

  const u = self.data;
  console.log(G(`✅ ${u.username}`) + D(` | $${(u.quota / 500000).toFixed(2)}`));

  // ── 真正签到：POST ──
  console.log(D("⏳ 签到中..."));
  const r = curlApi("/api/user/checkin", "POST", cfg.cookie, cfg.uid);

  if (r?._error) { console.log(R(`❌ ${r._error}`)); rl.close(); return; }

  if (r?.success) {
    const quota = r.data?.quota_awarded || 0;
    const date = r.data?.checkin_date || "";
    console.log(`\n ${G("✦")} ${C("╔══════════════════════════╗")}`);
    console.log(` ${G("✦")} ${C("║")}  ${G("🎉 签到成功！")}          ${C("║")}`);
    console.log(` ${G("✦")} ${C("║")}  日期 ${G(date)}       ${C("║")}`);
    console.log(` ${G("✦")} ${C("║")}  获得 ${G("$" + (quota/500000).toFixed(2))} 额度      ${C("║")}`);
    console.log(` ${G("✦")} ${C("╚══════════════════════════╝")}`);

    // 签到后查询累计
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
    const ck = curlApi(`/api/user/checkin?month=${month}`, "GET", cfg.cookie, cfg.uid);
    if (ck?.data?.stats) {
      const s = ck.data.stats;
      console.log(D(`   📊 连续 ${s.checkin_count} 天 | 累计 $${(s.total_quota/500000).toFixed(2)}`));
    }
  } else {
    const msg = r?.message || "";
    if (/已签到|already|重复/.test(msg)) {
      console.log(Y(`\n ⚠ 今日已签到过啦 (◕‿◕)`));
      const today = new Date();
      const month = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
      const ck = curlApi(`/api/user/checkin?month=${month}`, "GET", cfg.cookie, cfg.uid);
      if (ck?.data?.stats) {
        const s = ck.data.stats;
        console.log(D(`   📊 连续 ${s.checkin_count} 天 | 累计 $${(s.total_quota/500000).toFixed(2)}`));
      }
    } else {
      console.log(R(`❌ ${msg}`));
    }
  }
  rl.close();
}

main().catch(e => { console.error(R("❌ 出错了:"), e.message); process.exit(1); });

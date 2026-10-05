# CUN.AI 一键签到工具

自动完成 [cun.ai](https://www.cun.ai) 的每日签到，领取额度奖励。

> ⚠️ 仅供个人账号自动化使用。请勿用于批量注册、刷号等滥用行为。

---

## ✨ 功能

- **一键签到** —— 双击 `checkin.bat` 即可完成每日签到
- **自动登录** —— `auto-login.bat` 打开浏览器登录后自动抓取 Cookie 与 UID
- **代理自动检测** —— 优先读环境变量，其次读 Windows 注册表，无需手动配置
- **零依赖签到** —— 使用系统自带 `curl`，无需额外安装包
- **敏感信息隔离** —— Cookie 仅存本地，已被 `.gitignore` 排除

---

## 📁 项目结构

```
cun-checkin/
├── checkin.js          # 核心签到脚本（纯 Node.js + curl）
├── checkin.bat         # 双击签到
├── auto-login.js       # 浏览器自动登录取 Cookie + UID（Playwright）
├── auto-login.bat      # 双击自动登录
├── package.json
└── cun_cookies.json    # 本地凭据（已忽略，不会上传）
```

---

## 🚀 快速开始

### 环境要求

- Windows 10/11
- [Node.js](https://nodejs.org/) ≥ 18（自带 `fetch` 与 `node:` 模块）

### 第 1 步：安装依赖（仅 `auto-login` 需要）

```bash
cd cun-checkin
npm install
```

### 第 2 步：获取凭据（二选一）

**方式 A —— 自动弹窗（推荐）**

```bash
node auto-login.js
```

浏览器自动打开 → 手动登录 → 回终端按回车 → Cookie 与 UID 自动保存。

**方式 B —— 手动提取**

1. 浏览器登录 `https://www.cun.ai`
2. 按 `F12` 打开控制台，依次执行：

```js
// 1. 获取 Cookie
document.cookie

// 2. 获取 UID
localStorage.getItem("uid")
```

3. 保存到本地：

```bash
node checkin.js --save
```

### 第 3 步：签到

```bash
node checkin.js
```

或直接双击 `checkin.bat`。

---

## 🔧 命令行参数

| 参数 | 说明 |
|------|------|
| `checkin.bat` | 执行签到 |
| `checkin.bat --save` | 交互式保存 Cookie + UID |
| `checkin.bat --status` | 查看账号状态与签到统计 |
| `checkin.bat --help` | 显示帮助 |

---

## 🌐 代理说明

脚本按以下优先级自动检测代理：

1. 环境变量 `HTTPS_PROXY` / `HTTP_PROXY` / `https_proxy` / `http_proxy`
2. Windows 注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`

若站点无法直连，请确保代理软件（Clash / v2ray 等）已开启系统代理。

---

## 📡 接口说明

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/user/self` | GET | 获取账号信息，验证凭据有效性 |
| `/api/user/checkin?month=YYYY-MM` | GET | **查询**签到状态与历史记录 |
| `/api/user/checkin` | POST | **执行**每日签到 |

### 必需的请求头

| 请求头 | 说明 |
|--------|------|
| `Cookie` | 会话凭据（含 `session`） |
| `New-Api-User` | 用户 ID，取自前端 `localStorage.getItem("uid")` |
| `User-Agent` | 浏览器 UA |
| `Referer` | `https://www.cun.ai/` |

---

## ❓ 常见问题

**Q：提示「登录失效」？**

Cookie 已过期，重新执行 `node auto-login.js` 获取新凭据。

**Q：提示「curl退出码 28」？**

网络超时。请确认代理软件已开启，且系统代理设置正常。

**Q：提示「今日已签到」？**

属正常情况，说明当天已签到成功，每日仅可签到一次。

**Q：签到成功但网站没显示？**

请确认使用的是 `POST /api/user/checkin`。`GET` 只查询状态，不会实际签到。

---

## 📄 许可

MIT

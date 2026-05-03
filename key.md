# Cyclone-26 API Keys & Secrets

> 所有 key 只記錄變數名稱與用途，**不存放實際值**。實際值請見 `.dev.vars`（本地）或 Cloudflare Dashboard / GitHub Secrets（雲端）。

## 必要

| 變數 | 服務 | 用途 | 引用位置 |
|------|------|------|----------|
| `TURSO_DATABASE_URL` | Turso DB | 資料庫連線 URL | `src/lib/db.ts`, `src/lib/auth.ts`, `functions/api/**` |
| `TURSO_AUTH_TOKEN` | Turso DB | 資料庫認證 token | 同上 |
| `LETTA_API_KEY` | Letta AI | Cyclone 管家對話 Agent | `src/lib/letta.ts`, `functions/api/agent/chat.ts` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare | Pages 部署用 | `.github/workflows/cloudflare-pages-deploy.yml` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare | Pages 帳號 ID | 同上 |

## 選填

| 變數 | 服務 | 用途 | 引用位置 |
|------|------|------|----------|
| `GEMINI_API_KEY` | Google Gemini | Admin AI 分析建議 | `functions/api/admin/ai-insights.ts` |
| `GITHUB_TOKEN` | GitHub API | 提高 `/api/github/issues` 代理限額（60→5000/hr） | `functions/api/github/issues.ts` |
| `GITHUB_TOKEN` | GitHub Actions | CI/CD 預設 token | `.github/workflows/*.yml` |

## E2E 測試（選填）

| 變數 | 服務 | 用途 | 引用位置 |
|------|------|------|----------|
| `LT_USERNAME` | LambdaTest | 雲端 E2E 測試帳號 | `package.json` scripts |
| `LT_ACCESS_KEY` | LambdaTest | 雲端 E2E 測試密鑰 | `package.json` scripts |
| `E2E_BASE_URL` | — | E2E 測試目標 URL | `package.json` scripts |

## 設定位置

```
本地開發    → .dev.vars（gitignored）
CI/CD      → GitHub repo Settings > Secrets and variables > Actions
Cloudflare → Cloudflare Dashboard > Pages > cyclone-26 > Settings > Environment variables
```

## 待啟用（wrangler.toml 已預留）

| 綁定 | 服務 | 狀態 |
|------|------|------|
| `DB` | Cloudflare D1 | 已註解，目前用 Turso |
| `MEMORY_KV` | Cloudflare KV | 已註解，尚未使用 |

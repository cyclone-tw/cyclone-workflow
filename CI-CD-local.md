# CI-CD-local.md — 本地部署到 Cloudflare Pages 指南

> 本機 build → 直接上傳 dist/ → Cloudflare Pages，不經 GitHub Actions。

## 流程圖

```
┌─────────────────────────────────────────────────────────────┐
│                     本地開發機 (Dar)                          │
│                                                             │
│   bun run build  →  dist/  (static HTML + edge functions)   │
│         │                                                   │
│         ▼                                                   │
│   wrangler pages deploy dist  ──────────────────┐          │
│         │                                        │          │
│    ┌────┴──────────┐                             │          │
│    │ deploy.sh     │ ← 一鍵版                    │          │
│    │ local_deploy  │ ← 完整版 (branch preview)   │          │
│    │ bun run deploy│ ← package.json 內建         │          │
│    └───────────────┘                             │          │
│                                                   │          │
└───────────────────────────────────────────────────┼──────────┘
                                                    │
                                                    ▼
                                    ┌─────────────────────────────┐
                                    │      Cloudflare Pages       │
                                    │                             │
                                    │  main    → Production       │
                                    │             cyclone.tw      │
                                    │                             │
                                    │  其他 branch → Preview URL  │
                                    │             xxx.cyclone-    │
                                    │             26.pages.dev    │
                                    │                             │
                                    │  讀取 env vars:             │
                                    │  TURSO_DATABASE_URL ──────┐ │
                                    │  TURSO_AUTH_TOKEN ────────┤ │
                                    │  LETTA_API_KEY ───────────┤ │
                                    │  GEMINI_API_KEY ──────────┤ │
                                    └───────────────────────────┤ │
                                                                │ │
                                    ┌───────────────────────────┘ │
                                    │                             │
                                    ▼                             │
                           ┌──────────────┐                      │
                           │   Turso DB   │ ◄────────────────────┘
                           │  (遠端 prod)  │    .dev.vars 指向同一個 DB
                           └──────────────┘
```

---

## 方法一：deploy.sh（一鍵版）

```bash
bash deploy.sh
```

```
  bash deploy.sh
     │
     ├─► bun run bump:version          # 版號 vYYYYMMDD.HHMM
     │
     ├─► bun run build                 # Astro SSG → dist/
     │
     └─► bunx wrangler pages deploy dist --project-name=cyclone-26
              │
              ▼
        🟢 cyclone.tw (Production) 已更新
```

---

## 方法二：local_deploy.sh（完整版，支援 branch preview）

```bash
# 部署 main → Production
bash local_deploy.sh main
# ⚠️ 會要求輸入 'deploy' 確認

# 部署 feature branch → Preview URL
bash local_deploy.sh fix/120-ai-insights-decouple
```

```
  bash local_deploy.sh [branch]
     │
     ├─► bun run build
     │
     ├─► branch == main ?
     │     │              │
     │     ▼ YES          ▼ NO
     │   ⚠️ 輸入 'deploy'   直接部署
     │     │                │
     └─► wrangler pages deploy dist
          --project-name cyclone-26
          --branch $BRANCH
          --commit-dirty=true
              │
              ├─► main  → Production: https://cyclone.tw
              └─► 其他  → Preview:   https://xxx.cyclone-26.pages.dev
```

> `--commit-dirty=true` 允許未 commit 的變更也部署上去。

---

## 方法三：bun run deploy（package.json 內建）

```bash
bun run deploy
```

```
  bun run deploy
     │
     ├─► vitest run              # 先跑測試
     │
     ├─► astro build             # build
     │
     └─► wrangler pages deploy dist  # 部署
```

> 跟 deploy.sh 差別：多了 vitest 跑測試，少了 bump:version。

---

## 方法四：手動分步驟

```bash
bun run build                                    # 1. build
bunx wrangler pages deploy dist --project-name=cyclone-26  # 2. deploy
```

---

## DB Migration（部署後必做）

```bash
# 新增/修改 DB schema 後，部署完要手動執行
curl https://cyclone.tw/api/db/init

# 本地測試
curl http://localhost:4321/api/db/init
```

```
  部署新版程式碼 (deploy.sh)
     │
     ▼
  新版上線 ✅，但 DB schema 還是舊的 ❌
     │
     ▼
  curl https://cyclone.tw/api/db/init
     │
     ├─► CREATE TABLE IF NOT EXISTS
     ├─► ALTER TABLE / rebuild migration
     └─► Seed data
     │
     ▼
  DB 同步完成 ✅
```

> ⚠️ 只有單一 Turso production DB（無 dev 分離），動 DB 前先 backup 到 `./backups/`。

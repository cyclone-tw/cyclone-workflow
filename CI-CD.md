# Cyclone-26 CI/CD Pipeline

## 架構總覽

```
                        ┌─────────────────────────────────────────┐
                        │           開發者 (Dar)                   │
                        │  Claude Code (左 pane) + MiniMax (右)   │
                        └──────┬──────────────────────┬───────────┘
                               │                      │
                        git push               git worktree
                               │                      │
                               ▼                      ▼
                    ┌──────────────────┐    ┌──────────────────┐
                    │   GitHub Repo    │    │   Feature Branch  │
                    │   main branch    │    │   fix/xxx, feat/  │
                    └────────┬─────────┘    └────────┬─────────┘
                             │                       │
                             │  PR merge → main      │  PR review
                             │                       │
                             ▼                       ▼
                    ┌────────────────────────────────────────┐
                    │         GitHub Actions Workflows        │
                    │                                        │
                    │  1. cloudflare-pages-deploy.yml        │
                    │  2. tauri-release.yml                  │
                    └───────────┬────────────┬───────────────┘
                                │            │
                    ┌───────────▼──┐    ┌────▼─────────────┐
                    │  Cloudflare  │    │  GitHub Releases  │
                    │    Pages     │    │  (Desktop Apps)   │
                    │  cyclone.tw  │    │                    │
                    └──────┬───────┘    └────────────────────┘
                           │
                    ┌──────▼───────┐
                    │  Turso DB    │
                    │  (資料庫)     │
                    └──────────────┘
```

---

## 外部服務一覽

```
┌───────────────────┬───────────────────────────────────┬───────────┐
│      服務          │           用途                     │  費用模式  │
├───────────────────┼───────────────────────────────────┼───────────┤
│ Cloudflare Pages  │ 網站託管 + CDN + Edge Functions   │ Free tier │
│ Turso             │ SQLite 雲端資料庫 (libsql)         │ Free tier │
│ GitHub Actions    │ CI/CD 自動部署                     │ Free tier │
│ GitHub API        │ Issues / PR 代理                   │ Free tier │
│ Letta AI          │ Cyclone 管家對話 Agent             │ 付費      │
│ Google Gemini     │ Admin AI 分析建議                  │ Free tier │
│ LambdaTest        │ 雲端 E2E 測試 (Playwright)        │ Free tier │
│ Astro             │ SSG 框架                           │ 開源      │
│ Tauri             │ Desktop App 打包 (macOS/Win/Linux)│ 開源      │
└───────────────────┴───────────────────────────────────┴───────────┘
```

---

## Pipeline 1: Cloudflare Pages Deploy（主要）

```
觸發條件：push to main（排除 src/lib/version.ts）

  git push origin main
         │
         ▼
  ┌──────────────────────────────────────┐
  │  GitHub Actions                      │
  │                                      │
  │  1. checkout (fetch-depth: 0)        │
  │  2. setup Node.js 22                 │
  │  3. setup Bun (latest)               │
  │  4. bun install                      │
  │  5. bun run bump:version ──────┐     │
  │  6. bun run build              │     │
  │  7. cloudflare/pages-action    │     │
  │     → deploy dist/ to CF Pages │     │
  │  8. commit version bump back   │     │
  │     → push src/lib/version.ts ◀┘     │
  │                                      │
  │  Secrets: CLOUDFLARE_API_TOKEN        │
  │           CLOUDFLARE_ACCOUNT_ID       │
  └──────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  Cloudflare Pages                    │
  │                                      │
  │  Site: cyclone-26                    │
  │  Domain: cyclone.tw                  │
  │  Output: dist/ (static + _routes)    │
  │  Functions: functions/api/**         │
  │  Env Vars: 從 CF Dashboard 讀        │
  └──────────────────────────────────────┘
```

### 版號自動管理

```
  main 收到 push
         │
         ▼
  bump:version (scripts/bump-version.ts)
    讀取 .version.txt → 格式：YYYYMMDD.HHMM
    例：20260428.2136
         │
         ▼
  寫入 src/lib/version.ts
    export const VERSION = '20260428.2136'
         │
         ▼
  git commit + push version.ts 回 main
    （不觸發新的 deploy，paths-ignore 排除）
```

---

## Pipeline 2: Tauri Desktop Release

```
觸發條件：push tag desktop-v* 或手動觸發

  git tag desktop-v1.0.0 && git push --tags
         │
         ▼
  ┌──────────────────────────────────────────────────┐
  │  GitHub Actions (matrix: 4 platforms)            │
  │                                                  │
  │  ┌─────────────┐  ┌─────────────┐               │
  │  │ macOS ARM64 │  │ macOS x64   │               │
  │  │ → .dmg      │  │ → .dmg      │               │
  │  └─────────────┘  └─────────────┘               │
  │  ┌─────────────┐  ┌─────────────┐               │
  │  │ Ubuntu 22   │  │ Windows     │               │
  │  │ → .deb/.App │  │ → .msi/.exe │               │
  │  │   Image     │  │             │               │
  │  └─────────────┘  └─────────────┘               │
  │                                                  │
  │  Steps:                                          │
  │  1. checkout                                     │
  │  2. setup Node 22 + Bun                         │
  │  │  3. bun install + bun run build (frontend)    │
  │  4. setup Rust stable                            │
  │  5. cargo tauri build                            │
  │  6. upload artifacts                             │
  │  7. create GitHub Release (draft)                │
  └──────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  GitHub Releases (Draft)             │
  │                                      │
  │  Tag: desktop-v1.0.0                 │
  │  Assets:                             │
  │    cyclone-26_1.0.0_aarch64.dmg      │
  │    cyclone-26_1.0.0_x64.dmg          │
  │    cyclone-26_1.0.0_amd64.deb        │
  │    cyclone-26_1.0.0_amd64.AppImage   │
  │    cyclone-26_1.0.0_x64.msi          │
  │    cyclone-26_1.0.0_x64-setup.exe    │
  └──────────────────────────────────────┘
```

---

## 本地部署（手動）

### 開發環境

```bash
# 啟動 dev server
bun run dev              # → http://localhost:4321

# 本地預覽 build 結果
bun run build            # → dist/
bun run preview          # → http://localhost:4321 (預覽模式)
```

### 手動部署到 Cloudflare Pages

```bash
# 方法一：一鍵部署（含測試）
bun run deploy           # = vitest run + astro build + wrangler pages deploy dist

# 方法二：分步驟
bun run test             # 先跑測試
bun run build            # build
npx wrangler pages deploy dist  # 部署
```

### DB Migration

```bash
# 修復/初始化資料庫 schema
curl https://cyclone.tw/api/db/init    # 線上
# 或本地
curl http://localhost:4321/api/db/init  # 本地
```

### 版本號

```bash
# 手動 bump（通常不需要，CI 自動處理）
bun run bump:version     # 讀 .version.txt → 寫 src/lib/version.ts
```

---

## Git 工作流

```
                    main
                     │
        ┌────────────┼────────────┐
        │            │            │
   fix/120-xxx   fix/109-xxx  feat/135-xxx   ← feature branches
        │            │            │
   (worktree)   (worktree)   (worktree)       ← git worktree 隔離
        │            │            │
        ▼            ▼            ▼
      PR #156     PR #157     PR #xxx         ← PR review
        │            │            │
        └────────────┼────────────┘
                     │
                 merge to main
                     │
                     ▼
            自動觸發 Cloudflare
            Pages Deploy Pipeline
```

### 派工流程（多 Agent）

```
  Claude Code (左 pane, %0)           MiniMax Claude Code (右 pane, %1)
         │                                    │
  1. git worktree add                        │
     .worktrees/fix-120-xxx                  │
         │                                    │
  2. tmux send-keys ──────────────────────►  │
     "修復 Issue #120..."                    │
         │                              3. 讀 code + 修 bug
  3. 監控 capture-pane                       │
         │                              4. bun run build
  4. 確認完成                          5. git commit
         │                                    │
  5. git push -u origin ◄────────────────────┘
  6. gh pr create
  7. gh issue comment @owner
```

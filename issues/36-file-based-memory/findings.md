---
issue: 36
updated: 2026-04-12
---

# 多 AI 協作的檔案式記憶與規劃架構 — Findings

## 研究發現

### 1. `CLAUDE.md:115` 指向錯誤的檔案

- `CLAUDE.md:115` 寫「同步更新 `src/lib/version.ts` 的 CHANGELOG」
- 但實際上 **`src/lib/changelog.ts` 才是 changelog entry 的正確位置**,`src/lib/version.ts` 只存版本號字串
- 證據:`worklog-20260411-1437.md` 顯示 Issue #23 的變更清單明確列了 `src/lib/changelog.ts`(「新增 v20260411.4 changelog entry」) 和 `src/lib/version.ts`(「版本號更新」)是分開的兩個檔案
- 後果:`pr-11.md` 的 PR review 因此誤報 "missing changelog update"(score 75,borderline)
- 本 issue 順便修正這個錯誤

### 2. `CLAUDE.md:17-111` 是 Bun templates 預設塞的,對本專案不適用

- 內容是 `Bun.serve()` + `bun:sqlite` + HTML imports + `Bun.redis` + `Bun.sql` 範例
- cyclone-26 是 **Astro SSG + Cloudflare Pages Functions**,不使用這些 API
- 留著會誤導 AI(例如「嘗試用 `bun:sqlite` 連資料庫」而不是走 Turso libSQL client)
- 指令層級的 Bun 規則(`bun` vs `npm`)由 `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc` 負責,不需要重複在 CLAUDE.md

### 3. `AGENTS.md` 是 2025 下半年業界標準

- Codex、Cursor、Aider、Continue、Goose、Zed、Windsurf 都會自動 inject `AGENTS.md` 到 AI context
- 比寫 20 份 `.cursorrules` / `.windsurfrules` / `.goosehints` 高效得多
- cyclone-26 根目錄現有 20+ 個 AI 工具隱藏資料夾,正是最需要 `AGENTS.md` 的場景

### 4. planning-with-files 基準成績

- Anthropic 評測:檔案式記憶把 pass rate 從 **6.7% 推到 96.7%**
- 核心機制:把 AI 的 context window 當 RAM、檔案系統當永久磁盤
- 關鍵:`progress.md` 的「交棒筆記」區讓新接手的 AI 不必重讀全部歷史

### 5. `.omc/` 不應該被暴露到 AGENTS.md

- `.omc/` 是 Claude Code 的 oh-my-claudecode plugin 私有記憶,格式是 JSON(`project-memory.json` 597 行、`state/mission-state.json`、`checkpoints/` 等)
- 暴露給其他 AI 會讓它們困惑(「這個 project-memory.json 我該讀嗎?格式我不認識」)
- 保持 `.omc/` 僅由 Claude Code 使用,不寫進 AGENTS.md

### 6. `pr-11.md` 的 review agent 使用統計

- `pr-11.md` 顯示這個專案有使用 oh-my-claudecode 的 PR review 流程
- 使用了 3 個 Haiku + 5 個 Sonnet + 6 個 Haiku + 1 個 Haiku = 15 個 agent
- 代表 PR review 在這個專案是「系統化的」而非「人眼掃」—— `receiving-code-review` skill 特別重要

## 決策記錄

### 決策 1:資料夾命名 `issues/` vs `.planning/`
- **選 `issues/`**(非隱藏目錄)
- **理由**:AI tool 看得到、和 GitHub Issues 命名一致、延續使用者既有的 `issue-17.md` / `pr-11.md` 根目錄習慣
- **放棄 `.planning/`**:隱藏目錄違背「希望 AI 看到」的目標,Finder 和部分 AI tool 預設隱藏

### 決策 2:每 issue 用 3 檔還是 1 檔
- **選 3 檔**(`task_plan.md` + `findings.md` + `progress.md`)
- **理由**:使用者在 plan mode 明確選擇 planning-with-files 原版結構。3 檔讓新接手的 AI 能快速定位(該做什麼 / 學過什麼 / 現在進展),混在 1 檔需要全文掃
- **放棄 1 檔**:對日常小 issue 精簡度更高,但犧牲了「快速定位」能力

### 決策 3:GitHub Issues 同步策略
- **選純本地,frontmatter 放 `github_issue` 連結欄位**
- **理由**:自動雙向同步需要 GitHub App + rate limit 處理 + conflict resolve,成本極高
- **放棄自動同步**:不符合「不要 over-engineering」的使用者偏好

### 決策 4:CLAUDE.md 保留還是刪除
- **選保留,瘦身到 ~60 行**
- **理由**:`AGENTS.md` 需對所有 AI 中立,不適合講 Claude 專屬的 Superpowers skill invocation。把 Claude 特定的路由放 CLAUDE.md 更乾淨
- **放棄完全刪除**:會丟失 Claude Code 專屬的最佳設定路由

### 決策 5:Superpowers skills 選幾個
- **選 5 個**:`writing-plans` / `executing-plans` / `verification-before-completion` / `systematic-debugging` / `receiving-code-review`
- **理由**:每個都直接對應使用者既有的工作規則(plan 寫作、執行打勾、E2E 驗證、debug 方法、PR review 應對)
- **放棄的候選**:`test-driven-development`(Astro+Playwright 完整 TDD 太重)、`using-git-worktrees`(已會用,寫進去沒加值)、`subagent-driven-development`(和「不 offload 風格任務」矛盾)、`brainstorming`(有 `/deep-interview` 和 `/omc-plan` 替代)

### 決策 6:不做自訂 skill,用 `issues/_template/` 取代
- **選 `issues/_template/` 作為輕量「skill」**
- **理由**:使用者明確反對 over-engineering,一個樣板資料夾解決「新 issue 怎麼開」的問題,不需要打包成 skill
- **放棄自訂 skill**:等未來多個專案都需要這個模式,再抽成 `~/.claude/skills/cyclone-issue-flow/`

### 決策 7:搬家工作放在另一個 commit
- **選分 2 個 commit**:commit 1 新架構、commit 2 搬家
- **理由**:搬家是 mechanical,和新增規則混在一起會讓 PR review 難讀
- **也可以**:搬家放另一個 PR(另一個 issue)—— 若使用者偏好更小顆 PR

## 相關檔案路徑

- `CLAUDE.md:1-119` — 待重構(刪 L1-14 + L17-111,修 L115)
- `src/lib/changelog.ts` — changelog entry 的**正確**位置
- `src/lib/version.ts` — 只存版本號字串(不要手動改)
- `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc` — Bun 指令規則(不要動)
- `.omc/project-memory.json:1-597` — Claude Code 私有記憶(不要暴露)
- `.claude/settings.local.json` — superpowers 外掛啟用處
- `wiki/Architecture.md` / `wiki/Database.md` / `wiki/API.md` / `wiki/Environment.md` — AGENTS.md 只 reference 不 copy
- `issue-17.md` / `pr-11.md` / `worklog-20260411-1437.md` — 根目錄既有的散落規劃文件(待搬家,階段 4)
- `plan0.md` / `WORKLOG.md` — 歷史文獻,保留不搬
- `.github/workflows/cloudflare-pages-deploy.yml` / `.github/workflows/tauri-release.yml` — 自動部署設定(不動)

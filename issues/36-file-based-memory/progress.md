---
issue: 36
updated: 2026-04-12
---

# 多 AI 協作的檔案式記憶與規劃架構 — Progress

## 會話日誌

### 2026-04-12 — Dar + Claude Opus 4.6 (plan mode)

- Dar 提出需求:參考 planning-with-files,建立 issue folder + 調整 `CLAUDE.md` / `AGENTS.md`,讓多 AI 更好交棒,並建立 issue + PR draft
- 在 plan mode 做了完整研究:
  - Explore agent 研究 [planning-with-files](https://github.com/othmanadi/planning-with-files) 倉庫(3 檔模式、YAML frontmatter、hooks、Manus 理念、Anthropic 評測 96.7%)
  - Explore agent 盤點現有 AI 協作設定(CLAUDE.md 119 行、.omc、.claude、20+ AI 工具目錄、wiki/ 9 檔)
  - Plan agent 設計 `AGENTS.md` 結構、`issues/` 資料夾格式、`CLAUDE.md` 瘦身方案
- Dar 在 4 個關鍵決策點選擇:
  1. 資料夾命名 `issues/{n}-{slug}/`(非隱藏)
  2. 每 issue 用 **3 檔**(task_plan / findings / progress,planning-with-files 原版)
  3. GitHub sync:純本地,frontmatter 放 `github_issue` 欄位
  4. CLAUDE.md:瘦身到 ~60 行,只留 Claude 專屬
- 計畫檔寫入 `~/.claude/plans/lucky-imagining-pixel.md`,`ExitPlanMode` 通過

### 2026-04-12 — Claude Opus 4.6 (implementation)

- 建立 GitHub issue **#36**(https://github.com/cyclone-tw/cyclone-workflow/issues/36)
- 從 `fix/29_navbar-desktop-squeeze` 切回 `main`(pull 最新),建立 branch **`docs/36_agents-md`**
- 寫入新檔:
  - `AGENTS.md`(117 行,正體中文,跨 AI 共讀主檔)
  - `CLAUDE.md`(重構,119 → 44 行,修正 changelog.ts 指向錯誤)
  - `issues/README.md`(資料夾使用規則)
  - `issues/_template/{task_plan,findings,progress}.md`(3 檔樣板)
  - `issues/36-file-based-memory/{task_plan,findings,progress}.md`(本示範 issue)
- `bun run build` 綠(18 頁 1.73s)
- `grep` sanity check 全過(AGENTS.md 互引、changelog.ts 修正、CLAUDE.md 瘦身)
- commit `99dda4e` `docs(#36): add AGENTS.md + issues/ file-based memory structure`
- `git push -u origin docs/36_agents-md`
- **Draft PR #37 建立**:https://github.com/cyclone-tw/cyclone-workflow/pull/37

### 2026-04-12 後段 — Claude Opus 4.6 (self-correction)

- Codex stop-time review 指出:示範 issue 的交棒狀態是過期資訊(task_plan.md 的 pr 還是 null、checkbox 還沒打勾、progress.md 還寫「尚未取得 PR 編號」)
- Codex 說得對 —— 本 issue 是檔案式記憶架構的第一次 dogfooding,示範 issue 的 progress 本身就是架構是否成立的證據,狀態不即時就失去意義
- 更新 `task_plan.md`(status: in-progress → review、phase: implementation → verification、pr: null → 37、所有階段 1–3 的 checkbox 打勾)
- 更新本檔補「PR #37 建立成功」與交棒筆記
- 第二個 commit:`docs(#36): update demo issue state to reflect PR #37 creation`

## 交棒筆記

> 最重要的一區。新接手的 AI 請先讀這裡。

**目前狀態**:Draft PR #37 已開立,等 Dar review 與 merge。階段 1–3 全部完成。

**下一步應該**(選一個方向,看 Dar 決定):
1. **補 TODO**:Dar 親自填 `AGENTS.md` 的 war story、`task_plan.md` 的成功標準、`issues/README.md` 的新 issue 判斷準則
2. **階段 4 搬家**(另一個 commit 在同一個 PR,或另一個 issue):
   - `git mv issue-17.md issues/17-cyclone-requirements/task_plan.md`
   - `git mv pr-11.md issues/11-markdown-rendering/findings.md`
   - `git mv worklog-20260411-1437.md issues/23-gemini-ai-insights/progress.md`
   - 每檔補 frontmatter
3. **階段 5 跨 AI 冷啟動驗證**:Codex / Cursor 打開專案問「branch 命名規則」
4. **階段 6 merge**:PR ready for review → `src/lib/changelog.ts` 新增 entry → merge

**卡住的事**:無

**重要上下文**:
- **GitHub issue**:#36(https://github.com/cyclone-tw/cyclone-workflow/issues/36)
- **branch**:`docs/36_agents-md`(在 origin 上)
- **PR**:#37(https://github.com/cyclone-tw/cyclone-workflow/pull/37,draft)
- **commit**:`99dda4e docs(#36): add AGENTS.md + issues/ file-based memory structure`(9 files, +678 -118)
- **搬家工作**(`issue-17.md` / `pr-11.md` / `worklog-20260411-1437.md`)**不在 commit 99dda4e**,可加到本 PR 的新 commit 或另開 issue
- **TODO 留給 Dar 親自填**:
  - `AGENTS.md` 黃金規則第 4-6 條的 war story(Turso / LEFT JOIN / offload 各是哪次事件)—— 檔內已用 `<!-- TODO (Dar) -->` 標記
  - `task_plan.md` 驗收條件的「成功標準」定義(跨 AI 冷啟動算通過的門檻)
  - `issues/README.md`「什麼時候該開新 issue」的使用者偏好
- **設計決定全紀錄**:見 `findings.md` 的「決策記錄」區(7 個決定)
- **原始計畫檔**:`~/.claude/plans/lucky-imagining-pixel.md`

## 驗證結果

### bun run build
- [x] **Pass**(18 頁全部 build 成功,1.73s,11:07:48 完成)

### bun run test:e2e
- [ ] 未跑(純 docs 變更,理論上不影響 Playwright specs。PR ready for review 前補跑一次即可)

### 手動檢查
- [x] `grep AGENTS.md CLAUDE.md` — 3 處 match(L3 頂部指示、L22 subagent 規則、L44 末尾「其他規則」)
- [x] `grep changelog.ts CLAUDE.md` — 2 處 match(L33 主文、L38 線上頁面生成器)
- [x] `head -1 CLAUDE.md` = `# CLAUDE.md — Claude Code 專屬補充`
- [x] `wc -l CLAUDE.md` = 44 行(< 60 目標)
- [x] `wc -l AGENTS.md` = 117 行(< 200 目標)

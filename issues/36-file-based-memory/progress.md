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
  - `AGENTS.md`(~150 行,正體中文,跨 AI 共讀主檔)
  - `CLAUDE.md`(重構,瘦身到 ~50 行,修正 changelog.ts 指向錯誤)
  - `issues/README.md`(資料夾使用規則)
  - `issues/_template/task_plan.md`(靜態計畫樣板)
  - `issues/_template/findings.md`(研究發現樣板)
  - `issues/_template/progress.md`(動態日誌樣板)
  - `issues/36-file-based-memory/task_plan.md`(本示範 issue 計畫)
  - `issues/36-file-based-memory/findings.md`(本示範 issue 研究結果)
  - `issues/36-file-based-memory/progress.md`(本檔)

## 交棒筆記

> 最重要的一區。新接手的 AI 請先讀這裡。

**目前狀態**:階段 1 檔案建立完成。等待跑 `bun run build` 驗證 → commit → push → draft PR。

**下一步應該**:
1. `bun run build` 確認綠燈(純 docs 變更,理論上不會 fail,但走完流程)
2. `git add` 全部新檔
3. `git commit -m "docs(#36): add AGENTS.md + issues/ file-based memory structure"`
4. `git push -u origin docs/36_agents-md`
5. `gh pr create --draft --title "..." --body "..."`
6. 回報 PR 連結給 Dar

**卡住的事**:無

**重要上下文**:
- **GitHub issue**:#36(已建立,url:https://github.com/cyclone-tw/cyclone-workflow/issues/36)
- **branch**:`docs/36_agents-md`(從 main 切出)
- **PR 編號**:尚未取得(push 後執行 `gh pr create --draft`)
- **搬家工作**(`issue-17.md` / `pr-11.md` / `worklog-20260411-1437.md`)**不在本 commit**,放階段 4 的另一個 commit 做;或可延後到另一個 issue
- **TODO 留給 Dar 親自填**:
  - `AGENTS.md` 黃金規則第 4-6 條的 war story 細節(Turso 哪次事件、LEFT JOIN 是哪個 PR、offload 哪次出事)
  - `task_plan.md` 驗收條件的「成功標準」定義(跨 AI 冷啟動能答對什麼問題算通過)
  - `issues/README.md`「什麼時候該開新 issue」的使用者偏好
- **設計決定全紀錄**:見 `findings.md` 的「決策記錄」區
- **原始計畫檔**:`~/.claude/plans/lucky-imagining-pixel.md`

## 驗證結果

### bun run build
- [ ] 待驗證

### bun run test:e2e
- [ ] 選做,本變更純 docs 不應影響

### 手動檢查
- [ ] `grep AGENTS.md CLAUDE.md` 應 match(CLAUDE.md reference AGENTS.md)
- [ ] `grep changelog.ts CLAUDE.md` 應 match(changelog.ts 指向修正)
- [ ] `head -1 CLAUDE.md` 應是「# CLAUDE.md — Claude Code 專屬補充」
- [ ] `wc -l CLAUDE.md` 應 < 70(瘦身驗證)

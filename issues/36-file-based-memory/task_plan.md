---
issue: 36
title: 多 AI 協作的檔案式記憶與規劃架構 (planning-with-files)
status: in-progress
phase: implementation
priority: P1
owner: dar
created: 2026-04-12
updated: 2026-04-12
github_issue: 36
branch: docs/36_agents-md
pr: null
related_files:
  - AGENTS.md
  - CLAUDE.md
  - issues/README.md
  - issues/_template/task_plan.md
  - issues/_template/findings.md
  - issues/_template/progress.md
---

# 多 AI 協作的檔案式記憶與規劃架構

## 背景

cyclone-26 同時使用 20+ 個 AI 工具協作(`.claude/` `.cursor/` `.continue/` `.goose/` `.roo/` `.crush/` `.qwen/` `.trae/` `.windsurf/` `.kiro/` `.codebuddy/` `.factory/` `.junie/` `.kilocode/` `.kode/` `.neovate/` `.omc/` `.openhands/` `.qoder/` `.zencoder/` 等隱藏資料夾),但跨 AI 共讀的規則**只有 `CLAUDE.md` 一份**,內容還是 Bun templates 預設的 `Bun.serve` / `bun:sqlite` 範例(對 Astro+Cloudflare Pages 本專案完全不適用)。

所有工作流規則(PR draft 流程、Turso 備份、branch 命名、LEFT JOIN 陷阱、不 offload 風格敏感任務)目前只存在個人 Claude memory 裡,**Codex、Cursor、Goose、Roo、Continue 等工具完全看不到**。每次換一個 AI 就要重講一次規則,交棒成本極高。

更嚴重的是 `CLAUDE.md:115` 寫「同步更新 `src/lib/version.ts` 的 CHANGELOG」,但實際上 `src/lib/changelog.ts` 才是 entry 的正確位置 —— `pr-11.md` 的 PR review 因此誤報 "missing changelog update"。

參考 [planning-with-files](https://github.com/othmanadi/planning-with-files) 的 Manus 模式(把檔案系統當 AI 的長期記憶),導入 `AGENTS.md` + `issues/` 檔案式記憶架構。

## 目標

1. **`AGENTS.md`** 成為跨 AI 共讀的單一事實來源(2025 下半年業界標準,Codex / Cursor / Aider / Continue / Goose / Zed / Windsurf 都會自動 inject)
2. **`issues/{number}-{slug}/`** 資料夾用 3 檔 `task_plan` + `findings` + `progress` 管理任務交棒
3. **`CLAUDE.md`** 瘦身到 ~60 行,只留 Claude Code 專屬設定(Superpowers 路由、Subagent 規則、Hooks)
4. **第一個示範 issue**(本 issue 自己)跑通完整流程

## 驗收條件

- [x] GitHub issue #36 建立
- [x] Branch `docs/36_agents-md` 建立(從 main)
- [ ] `AGENTS.md` 建立完成(< 200 行,正體中文)
- [ ] `CLAUDE.md` 重構完成(119 → ~60 行,修正 changelog.ts 指向錯誤)
- [ ] `issues/README.md` 建立
- [ ] `issues/_template/{task_plan,findings,progress}.md` 建立
- [ ] `issues/36-file-based-memory/{task_plan,findings,progress}.md` 建立
- [ ] `bun run build` 綠燈
- [ ] PR #{N} draft 開立並附連結給 Dar

<!-- TODO (Dar): 定義「這個架構跑通了」的成功標準。建議自己加 2–3 條:
     例如「換另一個人 / 另一台電腦 cold start 能無縫接手當前 issue」
     或「Codex 冷啟動問 branch 命名規則能答出 {type}/{issue-number}_{slug}」 -->

## 階段 checklist

### 階段 1:建立新架構(本 commit)
- [x] 建立 GitHub issue #36
- [x] 建立 branch `docs/36_agents-md`
- [x] 寫 `AGENTS.md`
- [x] 寫 `issues/README.md`
- [x] 寫 `issues/_template/task_plan.md`
- [x] 寫 `issues/_template/findings.md`
- [x] 寫 `issues/_template/progress.md`
- [x] 寫 `issues/36-file-based-memory/task_plan.md`(本檔)
- [ ] 寫 `issues/36-file-based-memory/findings.md`
- [ ] 寫 `issues/36-file-based-memory/progress.md`
- [ ] 重構 `CLAUDE.md`(瘦身 + 修正 changelog.ts 路徑)

### 階段 2:驗證
- [ ] `bun run build` 綠
- [ ] `grep AGENTS.md CLAUDE.md` 有 match
- [ ] `grep changelog.ts CLAUDE.md` 有 match
- [ ] `grep -c 'version.ts' CLAUDE.md` 只出現在「不要手動改」的警告

### 階段 3:PR(本 commit 收尾)
- [ ] `git add` 全部新檔 + `CLAUDE.md`
- [ ] `git commit -m "docs(#36): add AGENTS.md + issues/ file-based memory structure"`
- [ ] `git push -u origin docs/36_agents-md`
- [ ] `gh pr create --draft`
- [ ] 回報 PR 連結給 Dar

### 階段 4:搬家(可另一個 commit,可延後)
- [ ] `git mv issue-17.md issues/17-cyclone-requirements/task_plan.md` + 補 frontmatter
- [ ] `git mv pr-11.md issues/11-markdown-rendering/findings.md` + 補 frontmatter
- [ ] `git mv worklog-20260411-1437.md issues/23-gemini-ai-insights/progress.md` + 補 frontmatter
- [ ] Commit 2

### 階段 5:跨 AI 驗證(人工,可延後)
- [ ] Claude Code 新 session 問「branch 命名規則」,應答出 `{type}/{issue-number}_{slug}`
- [ ] Codex CLI cold start 問同樣問題
- [ ] Cursor 打開專案問同樣問題
- [ ] 至少 2 個工具答對 = 通過

### 階段 6:Merge
- [ ] PR ready for review
- [ ] `src/lib/changelog.ts` 新增 entry(chore bump)
- [ ] Merge to main

## 問題 / 假設

- **假設**:Codex、Cursor 會自動讀取 `AGENTS.md`。實際驗證前先假設為真,由階段 5 驗證
- **未決**:要不要把 `WORKLOG.md` 和 `plan0.md` 也搬進 `issues/`?目前保留在根目錄作歷史文獻
- **未決**:要不要順便清理 20+ 個 AI 工具空目錄(`.agents/` `.codebuddy/` ...)?建議另一個 issue 處理,本 issue 不混進來
- **未決**:`隊員表單2026-04-10.csv` / `隊員表單2026-04-10-v2.csv` 目前在根目錄 untracked,是否應該加進 `.gitignore`?(敏感個資)

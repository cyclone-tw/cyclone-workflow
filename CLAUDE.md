# CLAUDE.md — Claude Code 專屬補充

> 本專案**共用規則請先讀 `AGENTS.md`**(跨 AI 共讀主檔)。本檔只記錄 Claude Code 專屬設定。

## Superpowers

已啟用 `superpowers@claude-plugins-official`(見 `.claude/settings.local.json`)。

建議在以下情境主動 invoke:

- 有 spec 要實作 → `superpowers:writing-plans`
- 拿既有 plan 繼續執行 → `superpowers:executing-plans`
- 宣告完成前 → `superpowers:verification-before-completion`
- 修 bug → `superpowers:systematic-debugging`
- 收到 PR review → `superpowers:receiving-code-review`

## Subagent 路由

- **可以 offload**:plan 類、search / explore 類、debug 類、research 類
- **不要 offload**:UI 文案、配色、微動畫、CSS 調整(風格敏感任務,subagent 看不到完整設計脈絡)

詳細理由見 `AGENTS.md` 黃金規則第 6 條。

## Hooks

目前未設定專案層級 hooks。

若日後需要加,放在 `.claude/settings.json`(**不是** `settings.local.json`),
這樣其他使用 Claude Code 的協作者也能共享。

## Changelog 維護

每次功能或修復變更,應同步更新 **`src/lib/changelog.ts`** 的 `CHANGELOG`:

- 新增一筆 `ChangelogEntry`(version 用當下 bump 的版號,date 用 UTC+8)
- 確保 `CHANGELOG[0]` 是最新版本
- push 到 main 會自動部署 + 自動 bump 版本號,但 **changelog 內容需手動維護**
- 線上 Changelog 頁面:https://cyclone.tw/changelog/(由 `src/lib/changelog.ts` 的 `CHANGELOG` 陣列生成)

> **注意**:不是 `src/lib/version.ts`。那個檔案只存版本號字串,不要手動改它的版本號欄位(自動部署會覆蓋)。PR #11 review 曾因此誤報 missing changelog update。

## 其他規則

見 `AGENTS.md`。

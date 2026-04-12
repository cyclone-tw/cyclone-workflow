# AGENTS.md — Cyclone-26 協作守則

> 所有 AI 工具請先讀本檔。Claude Code 可補讀 `CLAUDE.md` 取得專屬設定。

## 專案速覽

Cyclone 共學團(19 人)社群網站,部署在 https://cyclone.tw

- **框架**:Astro + React(SSG + Cloudflare Pages Functions)
- **執行環境**:Bun(禁用 npm / pnpm / yarn / npx)
- **資料庫**:Turso(libSQL,**單顆 production instance**,無 dev 分離)
- **部署**:Cloudflare Pages(push 到 main 自動部署)
- **桌面版**:Tauri(`desktop_app/`,選擇性使用)

延伸閱讀:

- `README.md` — 專案概覽
- `wiki/Home.md` — wiki 入口
- `wiki/Architecture.md` — 技術架構細節
- `wiki/Database.md` — DB schema
- `wiki/API.md` — API endpoints
- `wiki/Environment.md` — 環境變數清單
- `wiki/Features.md` / `wiki/Roles.md` / `wiki/Gantt.md` — 功能、角色、時程
- `plan0.md` — 原始大規劃(歷史文獻)
- `issues/` — 當前任務記憶與交棒工作區(見 `issues/README.md`)

## 黃金規則 (Golden Rules)

這 6 條是「被燒過」學來的硬規則,**違反任何一條都會造成明顯傷害**:

1. **禁止直接 push 到 main**。所有變更必須開 PR draft,自我 review 後轉 ready for review 再 merge。
2. **Branch 命名**:`{type}/{issue-number}_{slug}`,例如 `feat/36_agents-md`、`fix/29_navbar-desktop-squeeze`、`docs/36_agents-md`。`type` 使用 `feat` / `fix` / `docs` / `chore` / `test` / `refactor`。
3. **修改前先讀 `issues/{number}-*/task_plan.md`**,執行中更新 `progress.md`,完成後打勾 checklist 並把 status 改成 `done`。沒有對應 issue 資料夾的修改 = 臨時探索,不算工作成果。
4. **Turso 是單顆 production DB**。`.dev.vars` 連到同一顆 DB,**沒有 dev / prod 分離**。動 schema 前先 backup(`turso db shell ... ".dump" > backup.sql`),DROP 任何欄位或 table 前先在 PR 描述寫出影響範圍與回退步驟。<!-- TODO (Dar): 補「哪次 schema change 燒過」的 war story -->
5. **LEFT JOIN 搭配 WHERE filter 時,SELECT 要從 alias 取欄位**(特別是 id)。從主表取會讓 LEFT 側 null row 拉進主表 id 造成假資料。<!-- TODO (Dar): 補「是哪個 PR / 哪條 query」的 war story -->
6. **風格敏感任務不要 offload 給 subagent**(UI 文案、配色、微動畫、CSS 調整)。subagent 看不到完整設計脈絡,容易產出「看似合理但和既有風格不一致」的結果。Plan 類、debug 類、search 類、research 類可以 offload;style 類本尊做。<!-- TODO (Dar): 補「哪次 offload 出事」的 war story -->

## 指令速查

```bash
bun run dev                                # 開發伺服器(Astro,port 4321)
bun run build                              # 建置到 dist/
bun run test:e2e                           # Playwright E2E
bunx wrangler pages dev dist --port 8788   # 本機模擬 Cloudflare Pages Functions
gh issue list --state open                 # 查當前 open issues
gh pr list --state open                    # 查當前 open PRs
```

**禁用**:`npm`、`pnpm`、`yarn`、`npx`、`node <file>`、`ts-node`。一律用 `bun` / `bunx`。

## 完成的定義 (Definition of Done)

宣告「完成」前必須**全部綠燈**,少一項就不算完成:

1. `bun run build` 綠(無 TypeScript 錯誤、無 Astro build 錯誤)
2. `bun run test:e2e` 綠(若新增 regression 需補對應 spec)
3. 對應 `issues/{number}-*/task_plan.md` 的 checklist 全部打勾
4. PR draft **附 E2E 錄影或關鍵畫面截圖**
5. `src/lib/changelog.ts` 新增一筆 `ChangelogEntry`(version 用當下 bump 的版號,date 用 UTC+8)
6. PR 轉 ready for review,自我 review 過一次

## 檔案式記憶流程 (Planning with Files)

每個任務用 `issues/{number}-{slug}/` 資料夾管理,內含 3 個 .md 檔:

| 檔案 | 職責 | 讀 | 寫 |
|------|------|----|----|
| `task_plan.md` | 靜態計畫(背景 / 目標 / 驗收 / checklist) | 開工時讀全文 | 計畫有變動時改,checklist 進展時打勾 |
| `findings.md` | 研究發現與決策記錄 | 遇到陌生程式碼時讀 | 學到 non-obvious 技術事實時寫 |
| `progress.md` | 動態日誌與交棒筆記 | 每次 session 開頭讀交棒筆記 | 每次 session 結束時寫進度 + 交棒筆記 |

**為什麼分 3 檔而不是 1 檔**:讓新接手的 AI 能快速定位 —— 要看「該做什麼」讀 `task_plan`,要看「學過什麼」讀 `findings`,要看「現在進展」讀 `progress`。混在一起會讓交棒時要全文掃一次。

參考設計:[planning-with-files](https://github.com/othmanadi/planning-with-files)(Manus 模式:檔案系統當 AI 的長期記憶)。詳細用法見 `issues/README.md`。

## 交棒守則 (Handoff Protocol)

當你是新接手的 AI(換 session 或換工具):

1. **先看全域狀態**:`git status && git log --oneline -10`
2. **找到當前 issue**:`ls issues/` 或從 git branch 名推斷(branch 名開頭是 issue number)
3. **讀 `progress.md` 的「交棒筆記」區**(最高密度的上下文)
4. **讀 `findings.md` 的「決策記錄」區**(了解為什麼選 A 不選 B,避免重新辯論)
5. **讀 `task_plan.md` 的 checklist**(看剩下哪些 `- [ ]` 沒打勾)
6. **有疑問**:寫在 `findings.md` 的「問題 / 假設」區,不要直接動 code

## 禁止事項

- **絕對不 commit**:`.env`、`.dev.vars`、`隊員表單*.csv`、任何內含 API key / Google service account / Turso auth token 的檔案
- **不要改 `.cursor/rules/*.mdc`**:Cursor 專用 frontmatter 格式,搬走或改格式會讓 Cursor 讀不到
- **不要 Edit `src/lib/version.ts` 的版本號欄位**:push 到 main 會自動 bump,手動改會被覆蓋
- **不要預裝 Context7 以外的 MCP server**:使用者有自己的 MCP 偏好
- **不要把 `.omc/` 內部結構寫進 AGENTS.md / CLAUDE.md**:那是 Claude Code plugin 私有記憶
- **不要建立 `.ai/` / `.memory/` / `.context/` 新目錄**:所有共享狀態都放 `issues/`
- **不要預先 refactor**:Bug fix 只改 bug、feature 只做 feature,不順便「清理」周邊程式碼
- **不要 `--no-verify` 跳 hook、不要 `--force-push` 到 main**

## Superpowers Skills (Claude Code 限定)

本段只給 Claude Code 讀。其他 AI(Codex / Cursor / Goose / Roo / ...)可以跳過本節。

Claude Code 已啟用 `superpowers@claude-plugins-official`。建議在以下情境主動 invoke:

- 有 spec 要實作 → `superpowers:writing-plans`
- 拿既有 plan 繼續執行 → `superpowers:executing-plans`
- 宣告完成前 → `superpowers:verification-before-completion`
- 修 bug → `superpowers:systematic-debugging`
- 收到 PR review → `superpowers:receiving-code-review`

其他 Claude 專屬設定見 `CLAUDE.md`。

## 相關文件

- `issues/README.md` — issues 資料夾完整使用規則
- `issues/_template/` — 新 issue 起始樣板
- `CLAUDE.md` — Claude Code 專屬補充
- `wiki/` — 架構文件

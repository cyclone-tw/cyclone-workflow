# Cyclone Workflow Issues 狀態總覽

> 更新時間：2026-04-14 (v2)
> 統計：Open 14 / Closed 25 / Total 39

---

## 📊 摘要

| 狀態 | 數量 | 說明 |
|------|------|------|
| 🔴 Open | 14 | 進行中或未處理 |
| 🟢 Closed | 25 | 已完成或已解決 |

---

## 🔴 Open Issues (12)

### 📌 4/14 新增

#### #60 - feat: 許願樹認領機制重設計 — 多人認領 / 卡片留言 / 工具箱關聯
- **標籤**: enhancement
- **狀態**: 🔴 Open（複雜，需跨模組串接）

#### #59 - bug: 知識庫投稿內容超出卡片格子 + 需要展開/收納功能 🔴高優先
- **標籤**: bug
- **狀態**: 🔴 Open（影響所有使用者閱讀體驗）

---

### 📌 4/13 會後需求（meeting:20260413）

#### #54 - docs: 新手引導 — Git 版控 / Claude Code / SDD 流程
- **標籤**: documentation
- **狀態**: 🔄 進行中（wiki/Claude-Code-101.md 已建立，cyclone-tw 已確認先做 Wiki）

#### #53 - feat: 共學示範 / 教學許願子系統
- **標籤**: enhancement, discussion
- **狀態**: 🔴 Open（cyclone-tw 確認先 MVP：category 欄位 + filter）

#### #52 - fix: Bug 回報表單稽核 + 後端串接 + 圖片上傳
- **標籤**: bug, enhancement
- **狀態**: 🔴 Open（cyclone-tw 確認先做 Phase 0 稽核，圖片上傳不做）

#### #51 - feat: 討論區管理增強 — 留言刪除 / 管理員 / 成果分類 / Markdown
- **標籤**: enhancement
- **狀態**: 🔄 PR #58 DRAFT（E1+E2+E4 完成，cyclone-tw 已確認）

#### #50 - feat: 後台動態化 — 標籤管理 + 團隊成員頁 [Mega]
- **標籤**: enhancement
- **狀態**: 🔴 Open（涵蓋已關閉的 #61 需求）

#### #49 - feat: 個人儀表板 + 積分系統全面實作 [Mega]
- **標籤**: enhancement
- **狀態**: 🔴 Open（cyclone-tw 已確認 Phase 分期 + 積分規則）

---

### 📌 功能需求

#### #44 - feat: 每個成員有自己的資訊發佈空間（盤點 AI 服務 / 痛點回饋）
- **標籤**: enhancement
- **創建**: 2026-04-13
- **狀態**: 🔴 Open

#### #23 - feat: Google Analytics 顯示與分析後台 + AI 建議功能
- **標籤**: enhancement
- **創建**: 2026-04-11
- **狀態**: 🔄 PR #26 DRAFT（有 API Key 安全問題待修）

#### #15 - feat: 支援深色 / 淺色雙主題切換 (dark / light mode)
- **標籤**: enhancement, discussion
- **創建**: 2026-04-09
- **狀態**: 🔄 PR #39 DRAFT

---

### 📌 社群反饋

#### #43 - 🌈Rain #2530 [生活黑客], 期待許願樹長成千年神木 :13:
- **創建**: 2026-04-13
- **狀態**: 🔴 Open

#### #46 - 🎉 塞老師慶功宴：要請 Dar 大吃什麼？ 🤔
- **創建**: 2026-04-13
- **狀態**: 🔴 Open

---

### 📌 隱私 / 安全

#### #5 - 🔒 隱私與成員資料公開：同意機制與資料安全盤點
- **標籤**: discussion, privacy, blocker
- **指派**: @cyclone-tw
- **創建**: 2026-04-08
- **狀態**: 🔄 PR #40 DRAFT，大部分已確認

---

## 🟢 Closed Issues (25)

| # | 標題 | 標籤 | PR | 關閉時間 |
|---|------|------|-----|----------|
| #61 | feat: 後台成員管理 — 刪除/停用/改名/審核機制 | enhancement | (涵蓋於 #50) | 2026-04-14 |
| #55 | docs: 共學團啟動會議記錄 + 需求追蹤 | documentation | #56 | 2026-04-13 |
| #47 | feat: 留言區權限控制 — 僅登入用戶可留言 | | #48 | 2026-04-14 |
| #41 | feat: 最新公告系統 — 後台管理 + 前台顯示 | enhancement | #42, #45 | 2026-04-13 |
| #36 | docs: 導入 AGENTS.md 架構 | documentation | #37 | 2026-04-12 |
| #30 | feat: 儀表板功能補齊 + 知識庫/AI工具/許願樹 | enhancement | #35 | 2026-04-12 |
| #29 | bug: 導覽列桌面版文字擠壓 | bug | #34 | 2026-04-12 |
| #28 | feat: 管理後台增強 — 角色/成員/顯示名稱 | enhancement | #32 | 2026-04-11 |
| #27 | bug: 多項功能異常（時間/討論區/Issues） | bug | #33 | 2026-04-11 |
| #22 | fix: OAuth 重複帳號 + Email UNIQUE | bug | #57 | 2026-04-13 |
| #21 | [Frontend] 導列 RWD 問題 | bug | #24 | 2026-04-11 |
| #20 | [Bug] Google 登入問題 | bug | | 2026-04-11 |
| #18 | feat: 4/9 會後需求 — 全面改版規劃 | enhancement | #19 | 2026-04-10 |
| #17 | Cyclone 需求清單（討論記錄） | | | 2026-04-10 |
| #16 | feat(theme): 首頁 dark/light demo | enhancement | | 2026-04-11 |
| #14 | feat: AI Agent 工具知識卡片 CRUD | | | 2026-04-10 |
| #12 | [同步] main 自動跟 Cloudflare Pages 同步 | | #13 | 2026-04-11 |
| #10 | feat: ChatBox markdown rendering | enhancement | #11 | 2026-04-08 |
| #9 | 全球 AI 共學專案研究 | research | | 2026-04-09 |
| #8 | 生活黑客社群關係釐清 | discussion, branding | | 2026-04-09 |
| #7 | 進度追蹤/時間管理/習慣養成 | enhancement, discussion | | 2026-04-09 |
| #6 | CMS 與 Notion 整合評估 | enhancement, discussion | | 2026-04-11 |
| #4 | 內容更新前缺少資料清單 | | | 2026-04-11 |
| #3 | docs: 全面更新專案用詞與內容 | | | 2026-04-10 |
| #1 | feat: Tauri 桌面版應用程式 | | | 2026-04-08 |

---

## 🔗 PR 狀態

### Open Draft PRs

| PR | 標題 | Branch | 關聯 Issue |
|---|------|--------|-----------|
| #58 | 討論區管理增強 — 刪除/Markdown/author_id | `feat/51_discussion-management` | #51 |
| #40 | 隱私同意機制與資料安全盤點 | `feat/5_privacy-consent` | #5 |
| #39 | 深色/淺色主題切換 | `feat/15_dark-light-theme` | #15 |
| #38 | OAuth 重複帳號長期修復 | `fix/22_oauth-duplicate-accounts` | #22 |
| #26 | Gemini AI 分析建議功能 | `feat/23_gemini-ai-suggestions` | #23 |

### Recently Merged

| PR | 標題 | 關聯 Issue |
|---|------|-----------|
| #57 | fix(#22): OAuth 登入重複帳號 + Email UNIQUE 衝突 | #22 |
| #56 | docs(#55): 共學團啟動會議記錄 + 需求追蹤 | #55 |
| #48 | feat(#47): 留言區權限控制 — 僅登入用戶可留言 | #47 |
| #45 | test(#41): 公告系統 unit/integration/E2E 測試 | #41 |
| #42 | feat(#41): 最新公告系統 — 後台管理 + 前台顯示 | #41 |
| #35 | feat(#30): 儀表板/知識庫/AI工具/願望清單功能增強 | #30 |
| #34 | fix(#29): 修復 Navbar 桌面版文字擠壓問題 | #29 |

---

## 📋 優先處理建議

### 高優先級
1. **Issue #59** - 知識庫卡片溢出 bug + 展開/收納功能 🔴
2. **PR #58** - 討論區管理增強 review + merge
3. **Issue #54** - 新手引導 wiki（進行中 → MiniMax）
4. **Issue #52** - Bug 回報表單稽核 Phase 0
5. **PR #26** - 修復 API Key 安全問題

### 中優先級
6. **Issue #49** - 個人儀表板 + 積分系統 [Mega]
7. **Issue #50** - 後台動態化 [Mega]（涵蓋 #61）
8. **Issue #60** - 許願樹認領機制重設計（複雜）
9. **PR #39** - 深色/淺色主題 review
10. **PR #40** - 隱私同意機制 review

### 待討論
9. **Issue #53** - 共學示範 / 教學許願子系統
10. **Issue #44** - 成員個人資訊發佈空間
11. **Issue #5** - AI 管家隱私機制確認
12. **Issue #46** - 塞老師慶功宴吃什麼 🍖

---

*此文件由 Claude Code 自動同步，資料來源：GitHub Issues API*

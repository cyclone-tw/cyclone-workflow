# Cyclone Workflow Issues 狀態總覽

> 更新時間：2026-04-13
> 統計：Open 8 / Closed 16 / Total 24

---

## 📊 摘要

| 狀態 | 數量 | 說明 |
|------|------|------|
| 🔴 Open | 8 | 進行中或未處理 |
| 🟢 Closed | 16 | 已完成或已解決 |

| 類型 | 數量 |
|------|------|
| enhancement | 12 |
| bug | 6 |
| discussion | 6 |
| privacy | 1 |
| blocker | 1 |
| research | 1 |
| branding | 1 |

---

## 🔴 Open Issues (8)

### #44 - feat: 每個成員有自己的資訊發佈空間（盤點 AI 服務 / 痛點回饋）
- **標籤**: enhancement, discussion
- **指派**: 未指派
- **創建**: 2026-04-13
- **狀態**: 🔴 Open

**需求摘要**：提供個人發佈空間，讓成員能沉澱 AI 服務盤點、使用痛點與工作流程回饋，避免有價值經驗散落在 Discord 中。

**待討論**：
- 公開範圍（全公開 / 登入可見 / 可選）
- 是否需要積分/成就機制鼓勵分享
- 內容格式（自由文字 / 結構化表單）
- 與現有「討論區 Messages」的差異定位

---

### #2530 - 🌈Rain [生活黑客], 期待許願樹長成千年神木 :13:
- **標籤**: enhancement
- **指派**: 未指派
- **創建**: 2026-04-13
- **狀態**: 🔴 Open

**備註**：來自生活黑客社群成員 🌈Rain 的許願樹功能反饋。

---

### #30 - feat: 儀表板功能補齊 + 知識庫 / AI 工具箱 / 許願樹增強
- **標籤**: enhancement
- **指派**: @tboydar (Dar)
- **創建**: 2026-04-11
- **狀態**: 🔄 PR #35 已提交，等待 review

**需求摘要**：
| 急迫度 | 項目 | 狀態 |
|--------|------|------|
| **高** | AI 工具箱權限修正（陪跑員不應刪除他人投稿） | 🔄 PR #35 |
| 中 | 儀表板知識貢獻積分 | 🔄 PR #35 |
| 中 | 週檢核點 (W1/W2/W3 checkbox) | 🔄 PR #35 |
| 中 | 積分榜全員顯示 | 🔄 PR #35 |
| 中 | 知識庫成員篩選 | 🔄 PR #35 |
| 中 | 標籤共用 | 🔄 PR #35 |
| 中 | 工具箱投稿者顯示 | 🔄 PR #35 |
| 中 | 許願樹歷程追蹤 | 🔄 PR #35 |
| 低 | 愛心收藏機制 | 🔄 PR #35 |

**PR**: #35 (branch: `feat/30_dashboard-enhancements`)
**Code Review**: ✅ 已完成，發現權限驗證等問題需修復

---

### #29 - bug: 導覽列在桌面版螢幕寬度文字被擠壓
- **標籤**: bug
- **指派**: @tboydar (Dar)
- **創建**: 2026-04-11
- **狀態**: 🔄 PR #34 已提交，等待 review

**問題描述**：桌面版螢幕（13吋筆電、27吋外接螢幕）導覽列文字被壓縮、重疊
- 手機尺寸正常
- 問題在中間寬度區段（1280px-1440px）

**PR**: #34 (branch: `fix/29_navbar-desktop-squeeze`)
**Code Review**: ✅ 已完成，建議考慮 2xl 斷點優化

---

### #23 - feat: Google Analytics 顯示與分析後台 + AI 建議功能
- **標籤**: enhancement
- **指派**: 未指派
- **創建**: 2026-04-11
- **狀態**: 🔄 PR #26 DRAFT

**需求**：
1. GA4 數據顯示後台（DAU、MAU、跳出率、停留時間、流量來源）
2. Gemini AI 分析建議
3. 用量檢查機制（quota 滿時顯示提示）

**備註**：不急，等核心功能穩定後再處理

**PR**: #26 (branch: `feat/23_gemini-ai-suggestions`)
**Code Review**: ✅ 已完成，發現 API Key 傳遞方式等安全問題

---

### #22 - fix: OAuth 登入產生重複帳號 + 隊長 Email UNIQUE 衝突
- **標籤**: bug, enhancement
- **指派**: 未指派
- **創建**: 2026-04-10
- **狀態**: 🔄 主問題已修復，延伸需求待評估

**已修復**：
- ✅ 重複帳號問題（使用 substring name matching）
- ✅ 隊長 email 更新

**延伸需求**（來自 @cyclone-tw）：
- [ ] 新用戶預設為「訪客/待審核」而非直接給陪跑員身份
- [ ] 後台加入刪除成員功能
- [ ] 後台修改成員顯示名稱（email 除外）

---

### #15 - feat: 支援深色 / 淺色雙主題切換 (dark / light mode)
- **標籤**: enhancement, discussion
- **指派**: 未指派
- **創建**: 2026-04-09
- **狀態**: 💬 討論中，子 issue #16 已關閉

**待決定事項**：
1. 預設模式：dark / light / 跟隨系統？
2. 切換 UX：按鈕位置、是否有「跟隨系統」選項
3. 持久化：localStorage / cookie / 不記憶
4. 品牌一致性：light mode 是否保留霓虹元素？
5. 實作範圍：全站一次到位或先做首頁？

**相關**: #16（首頁 demo 已完成）

---

### #5 - 🔒 隱私與成員資料公開：同意機制與資料安全盤點
- **標籤**: discussion, privacy, blocker
- **指派**: @cyclone-tw
- **創建**: 2026-04-08
- **狀態**: 💬 大部分已確認，待確認 AI 管家隔離機制

**已確認**：
- ✅ 表單已加入公開同意確認
- ✅ Discord 編號已移除，只保留暱稱
- ✅ Repo 已設為 public，成員詳細資料僅後台可見
- ✅ 資料最小化原則同意

**待確認**：
- [ ] AI 管家對話隔離機制（技術確認中）
- [ ] Letta 資料保留政策

---

## 🟢 Closed Issues (16)

| # | 標題 | 標籤 | 關閉時間 |
|---|------|------|----------|
| #28 | feat: 管理後台增強 — 角色確認、成員管理、顯示名稱修改 | enhancement | 2026-04-11 |
| #27 | bug: 多項功能異常回報（時間顯示、討論區、Issues 頁面） | bug | 2026-04-11 |
| #21 | [Fontend] 導行列 RWD 問題 | bug | 2026-04-11 |
| #20 | [Bug] Google 登入問題 | bug | 2026-04-11 |
| #18 | feat: 4/9 討論會後需求整理 — cyclone.tw 網站全面改版規劃 | enhancement | 2026-04-10 |
| #17 | Cyclone 需求清單（討論記錄） | | 2026-04-10 |
| #16 | feat(theme): 首頁 dark/light 切換 demo | enhancement | 2026-04-11 |
| #14 | feat: AI Agent 工具知識卡片頁面 (CRUD) | | 2026-04-10 |
| #12 | [同步] 讓 main branch 自動跟 Cloudflare Pages 同步 | | 2026-04-11 |
| #10 | feat: ChatBox agent reply markdown rendering support | enhancement | 2026-04-08 |
| #9 | 🌍 全球 AI 共學專案研究：參考靈感與社群模式 | research | 2026-04-10 |
| #8 | 🏘️ 生活黑客社群關係釐清：品牌定位與用詞確認 | discussion, branding | 2026-04-10 |
| #7 | 📊 進度追蹤、時間管理與習慣養成機制設計 | enhancement, discussion | 2026-04-10 |
| #6 | 📝 CMS 與 Notion 整合評估：讓非技術成員也能更新內容 | enhancement, discussion | 2026-04-11 |
| #4 | ❓ 內容更新前需確認：缺少資料清單 | | 2026-04-11 |
| #3 | docs: 全面更新專案用詞與網站內容 | | 2026-04-10 |
| #1 | feat: Tauri 桌面版應用程式 (macOS/Windows/Linux) | | 2026-04-08 |

---

## 🔗 相關 PR 狀態

| PR | 標題 | Branch | 狀態 | 關聯 Issue |
|---|------|--------|------|-----------|
| #35 | 儀表板/知識庫/AI工具/願望清單功能增強 | `feat/30_dashboard-enhancements` | DRAFT | #30 |
| #34 | 修復 Navbar 桌面版文字擠壓問題 | `fix/29_navbar-desktop-squeeze` | DRAFT | #29 |
| #31 | 多項功能異常修復（時間顯示、討論區、Issues 頁面） | `copilot/fix-wishlist-time-display` | DRAFT | - |
| #26 | Gemini AI 分析建議功能 (#23) | `feat/23_gemini-ai-suggestions` | DRAFT | #23 |

---

## 📋 優先處理建議

### 高優先級（影響安全或核心功能）
1. **PR #35** - 修復 AI 工具 API 權限驗證問題
2. **PR #26** - 修復 API Key 傳遞方式安全問題

### 中優先級（使用者體驗）
3. **PR #34** - Navbar RWD 修復
4. **PR #31** - 時間顯示等 bug 修復

### 待討論
5. **Issue #44** - 成員個人資訊發佈空間設計
6. **Issue #22** - 確認延伸需求 scope
7. **Issue #15** - 深色/淺色主題設計決策
8. **Issue #5** - AI 管家隱私機制確認

---

*此文件由 Claude Code 自動生成，如需更新請重新執行 `/code-review`*

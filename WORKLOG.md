# Cyclone-26 工作日誌

## 2026-04-07 — Day 1：從零到上線

### 概要

在一個 session 內完成了 AI 工作流共學團網站的完整建置，從 `plan0.md` 出發，最終交付 13 頁全功能網站，部署於 Cloudflare Pages，域名 **cyclone.tw**。

### 時間軸

| 時間 | 版本 | 工作內容 |
|------|------|----------|
| 21:00 | v20260407.1 | 專案初始化 — Bun + Astro + Tailwind CSS v4，5 頁靜態網站（首頁/儀表板/團隊/知識庫/許願樹），部署 Cloudflare Pages |
| 21:14 | v20260407.2 | 新增 QA 知識集（AES-GCM 加密）、Cyclone 管家頁面、Letta Agent 整合、Turso DB（5 張表 + 6 位成員）、Pages Functions API |
| 21:39 | v20260407.3 | 新增使用說明（/readme，23+ 學習資源連結）、Bug 回報表單（/bug） |
| 22:16 | v20260407.4 | 新增討論區（/discuss，Turso DB 留言板）、Gemini AI 生成首頁圖片（hero + 4 張特色卡片）、更新 site URL 為 cyclone.tw |
| 22:21 | v20260407.5 | 加入 Google Tag Manager (GTM-TW4TS9CX) |
| 22:58 | v20260407.6 | 修正 Letta API 訊息格式（messages 陣列）、管家正式上線（cyclone/MiniMax-M2.7） |
| 23:00 | v20260407.7 | 版本號系統 + /changelog 頁面、修正管家 IME 中文輸入 Enter 鍵誤送出 |
| 23:15 | v20260407.8 | 新增 /issue GitHub-style 問題追蹤系統（Turso DB + 留言 + 狀態流轉） |
| 23:20 | v20260407.9 | 新增 /sitemap 網站架構圖（Mermaid flowchart）、修正 Issue 列表 API parsing |
| 23:48 | v20260407.10 | 管家對話歷史紀錄（自動存 DB + 分頁 + 搜尋）、加入 GA4 (G-WJQC4MZ9Y8) |

### 技術架構

```
Frontend:  Bun + Astro 6 + React (Islands) + Tailwind CSS v4
Backend:   Cloudflare Pages Functions (Workers)
Database:  Turso (LibSQL) — AWS AP-Northeast-1
AI Agent:  Letta (cyclone/MiniMax-M2.7) — Long-term Memory
Images:    Gemini API (gemini-2.5-flash-image)
Hosting:   Cloudflare Pages — cyclone.tw
Analytics: GTM (GTM-TW4TS9CX) + GA4 (G-WJQC4MZ9Y8)
```

### 頁面清單（13 頁）

| # | 頁面 | 路徑 | 類型 |
|---|------|------|------|
| 1 | 首頁 | `/` | 靜態 + AI 生成圖片 |
| 2 | 儀表板 | `/dashboard` | 靜態 |
| 3 | 團隊 | `/team` | 靜態 |
| 4 | 知識庫 | `/knowledge` | 靜態 |
| 5 | QA 知識集 | `/qa` | 靜態 + Web Crypto (AES-GCM) |
| 6 | Cyclone 管家 | `/agent` | React Island + Letta API |
| 7 | 許願樹 | `/wishlist` | 靜態 |
| 8 | 討論區 | `/discuss` | React Island + Turso DB |
| 9 | Issues | `/issue` | React Island + Turso DB |
| 10 | 使用說明 | `/readme` | 靜態 + 外部連結 |
| 11 | Bug 回報 | `/bug` | React Island (clipboard) |
| 12 | Changelog | `/changelog` | 靜態 (from version.ts) |
| 13 | Sitemap | `/sitemap` | 靜態 + Mermaid |

### API Endpoints

| Method | Path | 用途 |
|--------|------|------|
| POST | `/api/agent/chat` | 管家對話（Letta + 存 DB） |
| GET | `/api/agent/history` | 對話歷史（分頁 + 搜尋） |
| POST | `/api/db/init` | 資料庫初始化 |
| GET/POST | `/api/messages` | 討論區留言 |
| GET/POST | `/api/issues` | Issue 列表/建立 |
| GET/PATCH/POST | `/api/issues/:id` | Issue 詳情/更新/留言 |

### DB Tables

- `users` — 6 位成員
- `memories` — Agent 記憶
- `conversations` — 舊版對話記錄
- `weekly_progress` — 週進度
- `shared_knowledge` — 共享知識
- `messages` — 討論區留言
- `issues` — Issue 追蹤
- `issue_comments` — Issue 留言
- `chat_history` — 管家對話歷史

### Git Commits（11 commits）

```
a793537 feat: init AI 工作流共學團網站
e47696a feat: add QA, agent, Turso DB, Letta
9e5a203 feat: add /readme + /bug
272b89c feat: add /discuss + Gemini images + cyclone.tw
345b0d2 feat: add Google Tag Manager
3a245b9 fix: Letta API format + hardcode agent ID
bb3477f feat: version system + changelog + fix IME input
a37821a feat: add /issue GitHub-style issue tracker
51eb463 feat: add /sitemap + fix issue list parsing
ffa19e3 feat: chat history with pagination + search
85e9ea8 feat: add GA4 tracking
```

### 執行方式

使用 **Ultrawork** 並行執行引擎，多個 executor agents 同時建立不同頁面。關鍵決策：

1. **靜態 + Functions 混合架構**：頁面靜態產生（CDN 快速），API 由 Workers 處理（靈活）。比全 SSR 更穩定。
2. **AES-GCM 加密 QA**：真正的客戶端加密，即使看原始碼也無法讀取答案。
3. **Letta 長期記憶**：管家記住每位成員的對話歷史和偏好。
4. **Gemini 圖片生成**：用 AI 為首頁生成專業視覺圖片。

### 待辦 / 下一步

- [ ] 許願樹功能完善（真正的互動 CRUD）
- [ ] 儀表板動態化（從 DB 讀取真實進度）
- [ ] 語音輸入元件 MVP
- [ ] 成員登入系統（email-based）
- [ ] 訪客 vs 成員權限區分
- [x] cyclone.tw SSL 確認穩定 ✅
- [x] 桌面版應用程式 ✅

---

## 2026-04-08 — Day 2：桌面版 + 安全清理 + Release

### 概要

完成 Tauri v2 桌面版應用程式，支援 macOS (Apple Silicon + Intel)、Windows、Linux 三平台。建立 GitHub 組織 `cyclone-tw`，推送到 GitHub，清洗 git history 移除所有機密。第一版 Release 發布。

### 時間軸

| 時間 | 工作內容 |
|------|----------|
| 00:00 | 建立 /discuss 討論區留言板（Turso DB + Pages Functions） |
| 00:10 | README.md 中英雙語 + Mermaid 圖表 + .env.example |
| 07:00 | 建立 GitHub 組織 cyclone-tw/cyclone-workflow |
| 07:05 | 機密掃描：發現 Gemini API key 硬編碼，移除修正 |
| 07:10 | git filter-repo 重寫歷史，清除所有 secrets |
| 07:15 | Force push 乾淨歷史到 GitHub |
| 07:20 | 建立 Issue #1 + branch `feat/tauri-desktop-app` + Draft PR #2 |
| 07:30 | Tauri v2 專案初始化（Cargo.toml, tauri.conf.json, main.rs） |
| 07:35 | cargo tauri icon — 從 favicon.svg 生成全平台圖示 |
| 07:45 | 本機 macOS build 成功 — 7.8MB DMG |
| 07:50 | GitHub Actions CI — 4 平台建置（macOS x2, Windows, Linux） |
| 08:05 | CI 修正：Ubuntu 需要 Node.js 22 + artifact glob 路徑 |
| 08:30 | 4/4 平台全部建置成功 |
| 08:45 | Merge PR #2 到 main，打 tag desktop-v0.1.0 觸發 Release CI |
| 09:15 | Release CI 4/4 成功，6 個安裝檔 |
| 09:20 | 發布 Release v0.1.0 |

### Tauri 桌面版

```
Framework:  Tauri v2 (Rust backend)
Frontend:   Astro static build (embedded)
App Size:   ~8MB (DMG) — 比 Electron ~150MB 小 18 倍
Platforms:  macOS (ARM + x64), Windows (MSI + EXE), Linux (deb + AppImage)
CI/CD:      GitHub Actions — push desktop-v* tag 自動建置 + Release
```

### Release 安裝檔

| 平台 | 檔案 |
|------|------|
| macOS Apple Silicon | `Cyclone.Workflow_0.1.0_aarch64.dmg` |
| macOS Intel | `Cyclone.Workflow_0.1.0_x64.dmg` |
| Linux (.deb) | `Cyclone.Workflow_0.1.0_amd64.deb` |
| Linux (.AppImage) | `Cyclone.Workflow_0.1.0_amd64.AppImage` |
| Windows (.exe) | `Cyclone.Workflow_0.1.0_x64-setup.exe` |
| Windows (.msi) | `Cyclone.Workflow_0.1.0_x64_en-US.msi` |

**Release URL**: https://github.com/cyclone-tw/cyclone-workflow/releases/tag/desktop-v0.1.0

### 安全清理

- 發現 `scripts/generate-images.ts` 硬編碼 Gemini API key
- 使用 `git filter-repo` 重寫整個歷史移除 key
- Force push 乾淨歷史
- 驗證：`git log --all -p -S "AIzaSy"` 回傳空結果 ✅
- `.env` 從未進入 git ✅

### Git Commits（Day 2 新增）

```
4c795c0 security: remove hardcoded Gemini API key from script
dd1017d docs: add WORKLOG.md — Day 1 完整工作日誌
faf429e docs: add README.md (中英雙語 + Mermaid) + .env.example
e982b51 chore: init desktop_app directory for Tauri (#1)
8490d89 feat: Tauri v2 desktop app + GitHub Actions CI (#1)
0310b3d fix: CI add Node.js 22 + fix artifact glob paths
e86bcfd Merge PR #2: feat: Tauri 桌面版應用程式 (#1)
```

### 里程碑

- **GitHub 組織**: https://github.com/cyclone-tw
- **Repo**: https://github.com/cyclone-tw/cyclone-workflow
- **網站**: https://cyclone.tw (13 頁)
- **桌面版**: v0.1.0 (3 平台 6 安裝檔)
- **Issue #1**: Tauri 桌面版 — Closed ✅
- **PR #2**: Merged ✅

### 待辦 / 下一步

- [ ] 許願樹功能完善（真正的互動 CRUD）
- [ ] 儀表板動態化（從 DB 讀取真實進度）
- [ ] 語音輸入元件 MVP
- [ ] 成員登入系統（email-based）
- [ ] 訪客 vs 成員權限區分
- [ ] 桌面版自動更新機制

---

*由 dar #3808 撰寫 — 2026.04.08*

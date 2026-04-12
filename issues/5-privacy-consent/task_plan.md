---
issue: 5
title: 隱私與成員資料公開：同意機制與資料安全盤點
status: proposed
phase: planning
priority: P0
owner: cyclone-tw
created: 2026-04-12
updated: 2026-04-12
github_issue: 5
branch: feat/5_privacy-consent
pr: null
related_files:
  - src/pages/privacy.astro
  - functions/api/db/init.ts
  - .gitignore
  - CLAUDE.md
---

# 隱私與成員資料公開：同意機制與資料安全盤點

## 背景

Repo 為 public，網站即將公開 19 位成員資料（姓名、編號、頭像、自我介紹）。在更新內容前需要確認隱私政策與成員同意機制。標記為 blocker — 阻擋其他工作。

## 目標

1. 取得所有成員對資料公開的明確同意（Discord 確認即可）
2. 建立簡易隱私政策頁面 `/privacy`
3. 確認 git repo 無敏感資料外洩（API keys、個資 CSV 等）
4. 釐清 AI 管家（Letta）的資料保留政策

## 驗收條件

- [ ] 成員同意確認完成（Discord 截圖或紀錄）
- [ ] `/privacy` 隱私政策頁面上線
- [ ] `.gitignore` 加入敏感檔案規則（`.csv`、`.env`）
- [ ] `bun run build` 綠燈
- [ ] PR draft 開立
- [ ] `src/lib/changelog.ts` 新增 entry

## 階段 checklist

### 階段 1：成員同意（人工，需 repo owner 執行）
- [ ] 在 Discord 群組發公告說明網站會顯示哪些資料
- [ ] 取得每位成員回覆確認
- [ ] 記錄同意結果

### 階段 2：隱私政策頁面
- [ ] 建立 `src/pages/privacy.astro`
- [ ] 內容：收集哪些資料、用途、保留期限、聯絡方式
- [ ] 導覽列加入 Privacy 連結（Footer 或 Navbar）

### 階段 3：Git 安全
- [ ] `.gitignore` 加入 `*.csv`、敏感檔案規則
- [ ] 確認 `src/lib/` 無硬編碼 API keys
- [ ] 確認 `.env` 不在 git history 中

### 階段 4：資料最小化
- [ ] 確認公開頁面只顯示：暱稱、自選 emoji、自選顏色、角色、自願提供的自我介紹
- [ ] 確認不公開：Discord ID、真實姓名、聯絡方式

### 階段 5：驗證
- [ ] `bun run build`
- [ ] `/privacy` 頁面手動檢查
- [ ] `git log --all -- '*.csv'` 確認無 CSV 進入 history

### 階段 6：PR
- [ ] 開 draft PR
- [ ] `src/lib/changelog.ts` 新增 entry
- [ ] Ready for review
- [ ] Merge

## 問題 / 假設

- **假設**: Discord 訊息確認即為充分同意，不需正式簽署
- **未決**: 共學團結束後是否移除成員個資？
- **未決**: 是否需要 GDPR / 台灣個資法合規聲明？
- **未決**: Letta 管家資料保留政策需與服務提供商確認
- **blocked on**: 階段 1 需 repo owner（cyclone-tw）在 Discord 執行

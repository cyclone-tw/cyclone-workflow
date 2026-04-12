---
issue: 22
title: OAuth 登入產生重複帳號 + Email UNIQUE 衝突
status: proposed
phase: planning
priority: P1
owner: dar
created: 2026-04-12
updated: 2026-04-12
github_issue: 22
branch: fix/22_oauth-duplicate-accounts
pr: null
related_files:
  - functions/api/auth/callback.ts
  - functions/api/db/init.ts
  - wiki/Database.md
---

# OAuth 登入產生重複帳號 + Email UNIQUE 衝突

## 背景

Seed 用戶 email 為空字串 `''`，OAuth callback 用 email 查詢找不到配對，fallback 的 name matching 也因 Google 名稱（"Cyclone Kang"）與 seed 名稱（"Cyclone"）不一致而失敗。已 hotfix（清重複帳號 + 手動補 email），但根因未解決，未來新成員加入仍可能重現。

## 目標

1. OAuth callback 增加 fuzzy name matching（prefix-only + 最少 4 字元）防止重複帳號
2. `db/init.ts` seed 階段直接設定正確 email，避免空 email 配對問題
3. 管理後台增加帳號合併功能，管理員可合併重複帳號

## 驗收條件

- [ ] Google OAuth 新用戶登入時，fuzzy name matching 能正確配對 seed 帳號
- [ ] `db/init.ts` seed 用戶 email 不再是空字串
- [ ] 管理後台能合併兩個帳號（保留角色 + 打卡紀錄 + 討論紀錄）
- [ ] `bun run build` 綠燈
- [ ] PR draft 開立 + E2E 錄影/截圖附上
- [ ] `src/lib/changelog.ts` 新增 entry

## 階段 checklist

### 階段 1：OAuth callback 強化
- [ ] `callback.ts` 增加 prefix-only fuzzy name matching（最少 4 字元）
- [ ] 配對成功時自動更新 seed 帳號的 email + avatar
- [ ] 加入 log 記錄配對結果（方便 debug）

### 階段 2：Seed 用戶 email 修正
- [ ] `db/init.ts` seed 階段直接設定隊長正確 email
- [ ] 確保 `UNIQUE(email)` 不與 OAuth 自建帳號衝突
- [ ] 測試全新 deployment 的 seed → OAuth 流程

### 階段 3：管理後台帳號合併
- [ ] `POST /api/admin/merge-accounts` 端點
- [ ] 合併邏輯：保留目標帳號，遷移來源帳號的打卡/討論/知識庫貢獻
- [ ] AdminPanel UI 加入帳號合併功能

### 階段 4：驗證
- [ ] `bun run build`
- [ ] 手動測試 OAuth 登入流程
- [ ] 手動測試帳號合併流程
- [ ] 錄影/截圖歸檔

### 階段 5：PR
- [ ] 開 draft PR
- [ ] 自我 review
- [ ] `src/lib/changelog.ts` 新增 entry
- [ ] Ready for review
- [ ] Merge

## 問題 / 假設

- fuzzy name matching 的 minimum length 4 字元是否足夠？（目前已有 prefix-only 邏輯在 `callback.ts`）
- 帳號合併是否需要二次確認 dialog？（建議要）
- 合併後是否要軟刪除來源帳號？（建議要，保留歷史）

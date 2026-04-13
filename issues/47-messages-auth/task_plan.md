---
issue: 47
title: 討論區留言改為僅登入用戶可發表
status: review
phase: verification
priority: P1
owner: dar
created: 2026-04-13
updated: 2026-04-13
github_issue: 47
branch: feat/47-messages-auth
pr: null
related_files:
  - functions/api/messages/index.ts
  - src/components/discuss/MessageBoard.tsx
  - src/lib/auth.ts
  - tests/unit/messages/api.test.ts
  - e2e/messages-auth.spec.ts
---

# 討論區留言改為僅登入用戶可發表

## 背景

目前討論區允許未登入用戶以 anonymous 身份發表留言。
為維持社群品質並建立留言責任歸屬，改為僅登入用戶才能留言。
既有 anonymous 留言保留顯示，不刪除。

## 目標

- POST /api/messages 需驗證 session，未登入回 401
- 前端未登入時隱藏輸入框，顯示登入提示
- GET 公開瀏覽保持不變

## 驗收條件

- [x] 未登入 POST 回 401
- [x] 已登入 POST 回 200，author 為 session 用戶名稱
- [x] GET 公開可讀（無需登入）
- [x] 前端未登入顯示「請先登入再留言」+ 登入按鈕
- [x] 前端已登入顯示輸入框
- [x] Unit tests 7/7 通過
- [x] E2E tests 通過（未部署功能 skip）
- [x] `src/lib/changelog.ts` 新增 entry
- [x] `bun run build` 綠燈
- [x] PR draft 開立

## 階段 checklist

### 階段 1：後端
- [x] `functions/api/messages/index.ts` POST 加上 `requireAuth`
- [x] `if (err instanceof Response) return err` 攔截 auth 拋出的 Response
- [x] 移除 `bodyAuthor` fallback，author 固定取 `user.name`

### 階段 2：前端
- [x] `MessageBoard.tsx` 未登入時渲染登入提示卡片
- [x] 已登入時渲染 form（移除暱稱欄位）
- [x] `handleSubmit` 不再送 `author` 欄位

### 階段 3：測試
- [x] `tests/unit/messages/mock-db.ts` 建立 in-memory DB mock
- [x] `tests/unit/messages/api.test.ts` 7 unit tests
- [x] `e2e/messages-auth.spec.ts` 7 E2E tests（部署前 4 個 skip）

### 階段 4：PR
- [ ] 開 draft PR
- [ ] 自我 review
- [x] `src/lib/changelog.ts` 新增 entry
- [ ] Ready for review
- [ ] Merge

## 問題 / 假設

- 既有 anonymous 留言（author 欄位為隊員暱稱或空白）保留顯示，不需遷移
- E2E tests 使用 feature detection：未部署時 POST 仍回 200，4 個 test 自動 skip

---
issue: 47
---

# Findings — Issue #47

## 技術發現

### requireAuth 拋出 Response 而非 Error
`requireAuth` 在未登入時 `throw new Response(...)` 而非 `throw new Error`。
catch block 必須加 `if (err instanceof Response) return err;` 才能正確回傳 401/403，
否則會被當成 500 處理。

### 既有 POST handler 接受 bodyAuthor fallback
舊程式碼：`const author = user ? user.name : (bodyAuthor || '')`
意即未登入時可傳 `author` 欄位冒充任意名稱。加上 `requireAuth` 後此邏輯完全移除。

### E2E 測試需 feature detection
Live site (`https://cyclone.tw`) 尚未部署此 branch，POST 仍回 200。
E2E 用 `beforeAll` probe POST 是否回 401 決定 `authDeployed` flag，
相關 test 若 flag 為 false 則 `test.skip()`。

### vitest mock 路徑
Mock `@libsql/client/web`（非 `@libsql/client`），與 API 程式碼 import 路徑一致。

## 決策記錄

| 決策 | 選擇 | 原因 |
|------|------|------|
| 前端表單 author 欄位 | 移除 | 後端已強制用 session user，顯示多餘且可能誤導 |
| anonymous 舊留言 | 保留顯示 | 不影響功能，遷移無必要 |
| pending 用戶 | 回 403（沿用 requireAuth 預設） | 一致性，pending 用戶不具完整使用權限 |

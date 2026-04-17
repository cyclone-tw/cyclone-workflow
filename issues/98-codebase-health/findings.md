---
issue: 98
updated: 2026-04-17
---

# Findings — Issue #98

## 決策記錄

### D1 — 為什麼是 3 個 PR 不是 1 個

- **主張**:3 個獨立 PR(基礎、稽核、拆元件)
- **反方**:1 個 PR 一次到位,使用者只需 review 一次
- **結論**:3 個。理由:
  1. AGENTS.md 禁止事項「不要預先 refactor」(bug fix / feature PR 不混 refactor)—— 每個 PR 責任要清楚
  2. 拆元件若 E2E 紅,可以單獨 revert Phase 3 不影響 Phase 1 的基礎建設
  3. reviewer 的認知負擔線性上升,1 個 2000+ 行的 diff 會被草草掃過

### D2 — logger 要不要存 DB

- **主張 A**:client log POST 到 `/api/logs/client`,存 DB `error_logs` table
- **主張 B**:先只 console,未來需要再說
- **結論**:B。理由:Phase 1 不動 schema(黃金規則 4「動 schema 前先 backup」),避免混入非必要的 migration。Server 端接收後 `console.error` 到 Cloudflare Pages log,有需要再升級。

### D3 — apiFetch 失敗時:throw vs discriminated union

- **暫定**:discriminated union `{ ok: true, data } | { ok: false, error }`
- **狀態**:暫行版,Dar 可在 PR review 前修改
- 兩派差異:
  - **throw**:call site 用 try/catch,符合 JavaScript 習慣,但要記得包
  - **union** `{ ok: true, data } | { ok: false, error }`:強制 call site 檢查,無法忘記錯誤,但寫起來較囉嗦
- 選 union 的理由:
  1. 38 處既有 call site 已經在檢查 `data.ok`,union 讓這個檢查成為型別強制
  2. 網路層 error 與業務層 error 都走同一條回傳路徑,減少心智負擔
  3. 若未來需要 throw 語意,`apiFetchOrThrow<T>()` 已經提供過渡橋樑
- 內部邏輯細節:
  - 同時要求 `res.ok && json.ok !== false` 才算成功
  - error message 優先用 `json.error`,fallback 到 `HTTP {status}`
  - data 就是整包 JSON(不攤平)—— 保持與現有 server convention 完全相容

## 問題 / 假設

- [ ] `functions/api/` 的 error log 目前完全仰賴 Cloudflare Pages 內建 log?要不要確認 Dar 有 Cloudflare log 的存取?
- [ ] Phase 2 若發現 LEFT JOIN 違規,修正後資料量可能變動 —— 是否要通知使用者?

## 稽核結果

### LEFT JOIN 掃查(Phase 2 產出)

_待 Phase 2 完成後填入_

## 度量

### 程式碼減重(Phase 1 完成後填入)

| 項目 | 前 | 後 | 減少 |
|------|----|----|------|
| `fetch('/api` 呼叫 | 38 | ? | ? |
| `.json()` 呼叫 | 79 | ? | ? |
| `if (!data.ok)` 檢查 | 15 | ? | ? |

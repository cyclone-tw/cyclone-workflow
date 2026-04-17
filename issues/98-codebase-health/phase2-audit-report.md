---
issue: 98
phase: 2
branch: fix/98_left-join-audit
audit_date: 2026-04-17
audit_tool: scripts/audit-left-join.ts
---

# Phase 2 — LEFT JOIN 稽核報告

## TL;DR

**沒有發現黃金規則 5 違規**。11 處 LEFT JOIN query 全部通過:
- SELECT 的 id 一律帶 alias 前綴
- GROUP BY 完整(GROUP_CONCAT 場景)
- WHERE 條件用 alias

## 執行方式

```bash
bun scripts/audit-left-join.ts
```

掃 `functions/api/**/*.ts`(共 49 檔)中的 template literal SQL,抓含 `LEFT JOIN` 的 query,分類:

| 等級 | 條件 | 結果 |
|------|------|------|
| 🔴 HIGH | LEFT JOIN + WHERE + SELECT 裸 id | 0 處 |
| 🟡 MED  | LEFT JOIN + WHERE | 6 處 |
| 🟢 LOW  | LEFT JOIN 無 WHERE | 5 處 |

## 6 處 MED 逐一 review

| # | 檔案:行 | alias 正確? | 結論 |
|---|--------|-------------|------|
| 1 | `messages/index.ts:32` | `m.*` + `m.deleted_at` | ✅ 安全 |
| 2 | `messages/[id]/report.ts:48` | `mr.*` + `mr.message_id` | ✅ 安全 |
| 3 | `admin/announcements/[id].ts:24` | `a.*, u.name` + `a.id` | ✅ 安全 |
| 4 | `wishes/[id].ts:57` | `w.id` + `wisher.id AS ...` + `claimer.id AS ...` | ✅ 安全(雙 alias 同表) |
| 5 | `members/[id].ts:20` | `u.id` + `GROUP BY u.id` | ✅ 安全 |
| 6 | `members/index.ts:19` | `u.id` + `GROUP BY u.id` | ✅ 安全 |

## 5 處 LOW 逐一 review

| # | 檔案:行 | 結論 |
|---|--------|------|
| 1 | `admin/messages/index.ts:26` | alias + 無 WHERE,只 ORDER BY → 安全 |
| 2 | `admin/announcements/index.ts:23` | alias + 無 WHERE → 安全 |
| 3 | `admin/reports/index.ts:23` | 全欄位都 `mr.` / `m.` / `u.` → 安全 |
| 4 | `announcements/index.ts:21` | `a.id`, `u.name` → 安全 |
| 5 | `ai-tools/index.ts:58` | `at.*, u.name` → 安全 |

## 工具保留理由

- 未來新增 LEFT JOIN 的 endpoint 可以再跑一次稽核當 regression check
- 未來 schema 變動後可追溯影響範圍
- 黃金規則 5 是「被燒過」才加進 AGENTS.md 的,工具化讓這類知識不會只靠口耳相傳

## heuristic 限制

audit 用正則掃 SQL 字串,準確度有限:
- 不跨檔分析 view 或 CTE
- 不解析 prepared statement 動態組裝
- `GROUP BY` 是否完整只在人工 review 階段確認

這是為什麼 MED 被歸為「建議確認」而非直接判違規 —— 工具降低人眼掃描的負擔,不取代 review。

## 自我檢測 (self-test)

初版邏輯用「任何 id + 無任何 `alias.id`」當檢測條件,會**漏掉混合 alias + 裸 id 的 query**(例如 `SELECT u.id, id FROM ...`)。已改用 negative lookbehind 精確抓「前面不是 `.` 的 id」。

腳本開頭會跑 5 個固定 fixtures:
- 裸 id + LEFT JOIN + WHERE → 應判 HIGH
- 混合 aliased + 裸 id → 應判 HIGH
- 全 aliased → 應判 non-HIGH
- `AS id` 命名(非欄位 ref) → 應判 non-HIGH
- `wisher_id` 類內含 id 的複合欄位 → 應判 non-HIGH

self-test 失敗則直接 exit 1,避免在邏輯錯誤的情況下產出「全綠」假報告。

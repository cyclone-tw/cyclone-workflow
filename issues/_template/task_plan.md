---
issue: 0
title: {TITLE}
status: proposed          # proposed | in-progress | blocked | review | done | archived
phase: planning           # planning | implementation | verification | done
priority: P1              # P0 P1 P2 P3
owner: dar
created: 2026-04-12
updated: 2026-04-12
github_issue: null
branch: {type}/{issue-number}_{slug}
pr: null
related_files: []
---

# {TITLE}

## 背景

(為什麼要做這個?問題是什麼?引用相關檔案路徑與行號。)

## 目標

(完成後會有什麼不同?用 2–3 句話說清楚。)

## 驗收條件

- [ ] (具體可驗證的成功標準,例如「頁面載入 < 2s」、「用戶能 X」)
- [ ] `bun run build` 綠燈
- [ ] `bun run test:e2e` 綠燈
- [ ] PR draft 開立 + E2E 錄影/截圖附上
- [ ] `src/lib/changelog.ts` 新增 entry

## 階段 checklist

### 階段 1:(階段名稱)
- [ ] (具體任務)
- [ ] (具體任務)

### 階段 2:(階段名稱)
- [ ] (具體任務)

### 階段 3:驗證
- [ ] `bun run build`
- [ ] `bun run test:e2e`
- [ ] 手動 E2E 跑過
- [ ] 錄影/截圖歸檔

### 階段 4:PR
- [ ] 開 draft PR
- [ ] 自我 review
- [ ] `src/lib/changelog.ts` 新增 entry
- [ ] Ready for review
- [ ] Merge

## 問題 / 假設

- (目前還不確定的事、未來可能需要回來確認的假設)

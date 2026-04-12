# issues/ — 任務記憶與交棒工作區

每個任務一個資料夾,用 3 個 .md 檔在 AI 之間交棒。
設計理念參考 [planning-with-files](https://github.com/othmanadi/planning-with-files)(把檔案系統當 AI 的長期記憶)。

## 檔案結構

```
issues/
├── README.md                           # 本檔
├── _template/                          # 新 issue 樣板
│   ├── task_plan.md
│   ├── findings.md
│   └── progress.md
├── 36-file-based-memory/               # 第一個示範 issue
│   ├── task_plan.md
│   ├── findings.md
│   └── progress.md
└── 42-add-search/                      # (範例)未來 issue 長這樣
    ├── task_plan.md
    ├── findings.md
    └── progress.md
```

## 3 個檔案的職責

| 檔案 | 職責 | 什麼時候讀 | 什麼時候寫 |
|------|------|-----------|-----------|
| `task_plan.md` | 靜態計畫(背景 / 目標 / 驗收 / checklist) | 開工時讀全文 | 計畫有變動時改,checklist 進展時打勾 |
| `findings.md` | 研究發現與決策記錄 | 遇到陌生程式碼時讀 | 學到 non-obvious 技術事實時寫 |
| `progress.md` | 動態日誌與交棒筆記 | 每次 session 開頭讀交棒筆記 | 每次 session 結束時寫進度 + 交棒筆記 |

**為什麼分 3 檔而不是 1 檔**:讓新接手的 AI 能快速定位 —— 要看「該做什麼」讀 `task_plan`,要看「學過什麼」讀 `findings`,要看「現在進展」讀 `progress`。混在一起會讓交棒時要全文掃一次。

## 建立新 issue

1. 複製 `_template/` → 改名 `{number}-{slug}/`(number 對應 GitHub issue 或 PR 編號)
2. 編輯 3 個檔的 frontmatter:填 `issue`、`title`、`branch`、`github_issue`
3. 在 `task_plan.md` 填「背景 / 目標 / 驗收條件 / 階段 checklist」
4. 開始實作,進展寫進 `progress.md`

### 命名規範

- 資料夾名:`{number}-{slug}`
- slug 用 kebab-case(小寫 + 連字號),2–4 個單字
- 範例:
  - `36-file-based-memory`
  - `17-cyclone-requirements`
  - `23-gemini-ai-insights`
- `number` 必須和 GitHub issue / PR 編號對齊(先開的那一個即可)

## 開工時

- 讀 `progress.md` 的「交棒筆記」區(最高密度的上下文)
- 讀 `task_plan.md` 的 checklist 看剩下什麼
- frontmatter `status` 改 `in-progress`,`owner` 寫進自己的代號(例如 `dar`、`claude-opus-46`、`codex-gpt5`、`cursor-agent`)

## 完成時

- checklist 全部打勾
- frontmatter `status` → `done`,`phase` → `done`
- 填 `pr` 連結
- **不要刪除資料夾** —— 保留作歷史,未來搜尋「這個功能當初為什麼這樣做」找得到脈絡

## 什麼時候該開新 issue

<!-- TODO (Dar): 依你自己的任務粒度偏好調整這份清單 -->

- 需要修改超過 3 個檔案
- 需要跨 session 延續(今天做不完)
- 需要 schema migration、API 變更、設定檔變動
- 需要回報 stakeholder 進度
- 需要多個 AI 接力(例如 Claude 起稿 → Codex 補 test → Cursor 修 UI)

## 什麼時候不需要

- typo、一行 CSS 微調
- 純 `src/lib/changelog.ts` 的 entry 追加
- 純 version bump
- 實驗性探索(探索完再決定要不要開 issue)

## 和 GitHub Issues 的關係

**純本地為主,frontmatter 放連結**。

- `task_plan.md` frontmatter 的 `github_issue` 欄位填對應 issue 編號(有就填,沒有就 `null`)
- **不做自動雙向同步**(成本太高)
- 要看 GitHub 最新討論用 `gh issue view {n}`
- 要把本地進度寫回 GitHub 用 `gh issue comment {n} --body "..."`

## 狀態欄位 (frontmatter `status`)

| status | 意思 |
|--------|------|
| `proposed` | 構想中,還沒開工 |
| `in-progress` | 進行中 |
| `blocked` | 被別的 issue / 外部因素卡住 |
| `review` | 實作完成,等 PR review |
| `done` | 已 merge |
| `archived` | 不做了(廢案),保留作歷史 |

## phase 欄位

| phase | 意思 |
|-------|------|
| `planning` | 還在寫計畫 |
| `implementation` | 寫 code 中 |
| `verification` | build / E2E / 手動測試中 |
| `done` | 全部完成 |

## progress.md 穩定性原則

**禁止在 progress.md 追蹤動態 count 或當前 commit 狀態**。

為什麼:

- 檔案是某個 commit 的一部分,寫入時該 commit 還不存在,無法寫入自己的 SHA
- 寫「當前 PR 有 N 個 commit」之類的 count,追 count 的 commit 本身會讓 count 立刻變舊 —— chicken-and-egg
- 任何試圖描述「當前狀態」的清單(commit 歷史、分支 HEAD、尚未 push 的 commit 數)都會永遠落後一步
- 寫 placeholder「本 session 新增的 commit」一樣會過期,只是換個糖衣

正確做法:

- **會話日誌** 可以記錄 session 內「做了什麼」,commit SHA 由**後續** session 的日誌補上(如需)—— 歷史事實不會過期
- **當前 PR commit 歷史、分支 HEAD、commit count** 等動態資訊**不寫進檔內**,直接請讀者跑 `git log --oneline origin/{branch}` 或 `gh pr view {N}`
- 檔內只記 **stable facts**:issue 編號、branch 名、PR 編號、設計決定、session 已發生的事、下一步要做什麼
- 寫 guidance 時避免 ordinal(「第 N 個 commit」),改用「新增 commit」

這條規則從 issue #36 的 Codex self-correction 系列學到 —— 正因為本 issue 是架構的第一次 dogfood,每一種 staleness pattern 都被逼出來修掉。詳細歷程見該 PR 的 commit 記錄。感謝 Codex stop-time review。

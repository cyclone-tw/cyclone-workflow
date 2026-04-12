---
issue: 15
title: 深色 / 淺色雙主題切換 (dark / light mode)
status: proposed
phase: planning
priority: P2
owner: dar
created: 2026-04-12
updated: 2026-04-12
github_issue: 15
branch: feat/15_dark-light-theme
pr: null
related_files:
  - src/styles/global.css
  - src/layouts/Layout.astro
  - src/components/auth/LoginButton.tsx
---

# 深色 / 淺色雙主題切換

## 背景

來自 innoblue（生活黑客）的需求。目前全站只有「深色霓虹賽博龐克」風格，所有顏色寫死在 `src/styles/global.css` 的 `@theme` 指令中，沒有 `data-theme` 屬性、沒有 Tailwind `dark:` 變體，沒有任何主題切換基礎建設。

## 目標

1. 全站支援 dark / light 雙主題切換
2. 預設跟隨系統 `prefers-color-scheme`，手動切換後記憶在 `localStorage`
3. 不產生 FOUC（頁面渲染前就決定主題）
4. Light mode 保留品牌主色但調整對比

## 前置討論（GitHub issue #15 需先決定）

- [ ] 預設模式：跟隨系統 / 永遠 dark / 永遠 light
- [ ] 切換按鈕位置：Navbar 右上 / Footer / 設定頁
- [ ] Light mode 是否保留 neon glow / glass morphism
- [ ] 主色 `#6C63FF` / `#E94560` 在白底是否需微調
- [ ] 範圍：全站一次到位 or 分階段

## 驗收條件

- [ ] Dark mode 外觀與現行一致（不改壞）
- [ ] Light mode 可讀性良好、對比充足
- [ ] 切換按鈕正常運作、偏好持久化
- [ ] 頁面載入無 FOUC
- [ ] `bun run build` 綠燈
- [ ] PR draft 開立 + 各頁面雙主題截圖
- [ ] `src/lib/changelog.ts` 新增 entry

## 階段 checklist

### 階段 1：CSS 變數拆分
- [ ] `global.css` 把 `@theme` 拆成 `:root`（light）與 `[data-theme="dark"]`（dark）
- [ ] 確認所有 CSS 變數都有 light/dark 兩組值
- [ ] 寫死顏色的元件改用 CSS 變數（`text-[#xxx]` → `text-[var(--color-xxx)]`）

### 階段 2：主題切換基礎建設
- [ ] `Layout.astro` `<head>` 加 inline script 讀 `localStorage` + `prefers-color-scheme`
- [ ] `<html>` 加 `data-theme` 屬性
- [ ] 新增 `ThemeToggle` 元件（太陽/月亮 icon）

### 階段 3：全站元件審計
- [ ] 搜尋所有 inline style 的寫死顏色（`#F0F0FF`、`#9090B0` 等）
- [ ] 改用語意化 CSS 變數
- [ ] React island 元件的 inline styles 改用 CSS 變數

### 階段 4：驗證
- [ ] `bun run build`
- [ ] 手動切換 dark/light 確認每個頁面
- [ ] 手機版切換測試
- [ ] 各頁面截圖歸檔

### 階段 5：PR
- [ ] 開 draft PR
- [ ] 自我 review
- [ ] `src/lib/changelog.ts` 新增 entry
- [ ] Ready for review
- [ ] Merge

## 問題 / 假設

- 20+ 個 React island 元件都有 inline style 寫死顏色，改動量大
- Light mode 的 glass morphism 效果可能需要不同 blur/opacity 參數
- OG image 目前是 dark 版，是否需要 light 版？

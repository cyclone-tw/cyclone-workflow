#!/bin/bash
cd /Users/eugene/cyclone-26/.claude/worktrees/fix-148-display-name
git checkout fix/148-comment-display-name
claude -p "修復 bug #148：留言區顯示 Google 帳號名而非自訂暱稱。Root cause：所有 comment API 用 SELECT u.name AS author_name，應改用 display_name（fallback name）。需修改：1) functions/api/ 下所有 comments.ts 的 SQL query，把 u.name 改成 COALESCE(u.display_name, u.name) AS author_display_name，2) src/components/ResourceComments.tsx 把 author_name 改成 author_display_name，3) 其他有用到 author_name 顯示留言的元件也要改。先讀 AGENTS.md，再搜尋所有 author_name 用法，逐一修改。完成後 git add -A && git commit -m 'fix(#148): 留言區顯示 display_name 而非 Google 帳號名' && git push。"

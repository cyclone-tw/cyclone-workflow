#!/usr/bin/env bun
/**
 * 掃 functions/api/**\/*.ts 裡含 LEFT JOIN 的 SQL,尤其是同時有 WHERE 的。
 * 依 AGENTS.md 黃金規則 5,這類 query 的 SELECT 必須用 alias,不能從主表取 id。
 *
 * 這支工具只產出 "需人工 review" 的清單,不做自動改寫 —— SQL 語意判斷太細。
 * 用法:bun scripts/audit-left-join.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface Finding {
  file: string;
  startLine: number;
  sql: string;
  hasWhere: boolean;
  selectsUnaliasedId: boolean;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * 抓 db.execute 或 backtick 字串字面值的 SQL。
 * 做簡化:把 backtick template literal 完整 slice 下來,不解析插值。
 */
function extractSqlBlocks(source: string): Array<{ sql: string; startLine: number }> {
  const blocks: Array<{ sql: string; startLine: number }> = [];
  const lines = source.split('\n');
  let inBacktick = false;
  let buf: string[] = [];
  let startLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '`') {
        if (inBacktick) {
          const sql = buf.join('\n');
          if (/\bLEFT\s+JOIN\b/i.test(sql)) blocks.push({ sql, startLine });
          buf = [];
        } else {
          startLine = i + 1;
        }
        inBacktick = !inBacktick;
      } else if (inBacktick) {
        // collect char to current line buffer
      }
    }
    if (inBacktick) {
      // 當前行整行(含換行)納入
      if (buf.length === 0 && line.includes('`')) {
        buf.push(line.slice(line.indexOf('`') + 1));
      } else {
        buf.push(line);
      }
    }
  }
  return blocks;
}

function analyze(sql: string): { hasWhere: boolean; selectsUnaliasedId: boolean } {
  const hasWhere = /\bWHERE\b/i.test(sql);
  // 簡化:檢查 SELECT 區段是否有「裸欄位 id」或「表名.id」且那個表名沒被 alias
  //   - `SELECT id,` 或 `SELECT id FROM` -> 裸 id,需 review
  //   - `SELECT main_table.id` -> 若 main_table 有被 alias 為 t,則視為違規
  // 暫以 heuristic:只要出現 ` id,` 或 ` id\n` 或 ` id FROM` 就標記
  const selectPart = sql.match(/SELECT([\s\S]*?)FROM/i)?.[1] ?? '';
  const selectsUnaliasedId = /\bid\s*[,\s]/i.test(selectPart) && !/[A-Za-z_]\w*\.id/i.test(selectPart);
  return { hasWhere, selectsUnaliasedId };
}

function main(): void {
  const root = join(process.cwd(), 'functions/api');
  const files = walk(root);
  const findings: Finding[] = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf-8');
    const blocks = extractSqlBlocks(source);
    for (const { sql, startLine } of blocks) {
      const { hasWhere, selectsUnaliasedId } = analyze(sql);
      findings.push({ file: relative(process.cwd(), file), startLine, sql, hasWhere, selectsUnaliasedId });
    }
  }

  // 分類輸出
  const highRisk = findings.filter((f) => f.hasWhere && f.selectsUnaliasedId);
  const medRisk = findings.filter((f) => f.hasWhere && !f.selectsUnaliasedId);
  const lowRisk = findings.filter((f) => !f.hasWhere);

  console.log(`\n# LEFT JOIN 稽核報告 — ${new Date().toISOString().slice(0, 10)}\n`);
  console.log(`掃描範圍:functions/api/**/*.ts(共 ${files.length} 檔)`);
  console.log(`找到 LEFT JOIN query 共 ${findings.length} 處:\n`);
  console.log(`- 🔴 HIGH:LEFT JOIN + WHERE + 可能裸 id  → ${highRisk.length} 處(**必看**)`);
  console.log(`- 🟡 MED :LEFT JOIN + WHERE             → ${medRisk.length} 處(建議確認 SELECT 用 alias)`);
  console.log(`- 🟢 LOW :LEFT JOIN,無 WHERE           → ${lowRisk.length} 處(通常安全)`);

  const section = (title: string, items: Finding[]) => {
    if (items.length === 0) return;
    console.log(`\n## ${title}\n`);
    for (const f of items) {
      console.log(`### ${f.file}:${f.startLine}`);
      console.log('```sql');
      console.log(f.sql.trim());
      console.log('```\n');
    }
  };

  section('🔴 HIGH 風險(必看)', highRisk);
  section('🟡 MED 風險(建議確認)', medRisk);
  section('🟢 LOW 風險(LEFT JOIN 無 WHERE,貼上供完整追溯)', lowRisk);
}

main();

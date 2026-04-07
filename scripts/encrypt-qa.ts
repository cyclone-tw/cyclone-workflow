/**
 * Bun script to encrypt QA sample data.
 * Run: bun run scripts/encrypt-qa.ts
 */

const ITERATIONS = 100_000;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
}

function toBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

async function encrypt(plaintext: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  };
}

// Sample QA data to encrypt
const qaItems = [
  {
    id: 'qa-001',
    title: '如何評估自身需求選擇對應的 Claude 付費方案？',
    content: `建議先買一個月的 Pro 就好了，試試水溫。

去年 9 月買的時候也想了一下，因為買了就會有另一種「沒用完好可惜」的焦慮。不建議第一次就直接買一年，除非確定未來一年內有大量的使用情境。

可以看看 Papaya 大大的（目前最新手友善的 Claude 教學）：
- https://www.youtube.com/watch?v=2pM-7fBXc_M
- https://www.youtube.com/watch?v=_cVTzXvb7xs

— βenben #0010`,
    password: 'claude2026',
    author: '珊迪',
    authorTag: '#2429',
    createdAt: '2026-04-07',
  },
  {
    id: 'qa-002',
    title: '這個團是否要做一個 vibe coding 出來的 web page 做入口？',
    content: `是的！我們使用 Bun + Astro + Cloudflare Pages 搭建了共學團網站。

網站功能：
- 首頁：團隊介紹與四週時程
- 儀表板：個人進度追蹤
- 團隊頁：成員列表與 Project 交換
- 知識庫：工作流模板與最佳實踐
- 許願樹：互助機制

先一版網站：https://cyclone-26.pages.dev/
後續會加上 Agent Memory、語音輸入等功能。

— dar #3808`,
    password: 'vibe',
    author: 'Benson',
    authorTag: '#2808',
    createdAt: '2026-04-07',
  },
  {
    id: 'qa-003',
    title: '什麼是 Agent Memory？為什麼共學團需要它？',
    content: `Agent Memory 是讓 AI 助手「記住」每位成員的個人記憶系統。

三層記憶架構：
1. L1 即時記憶（KV）— 當前對話上下文、最近互動摘要
2. L2 短期記憶（D1）— 本週學習進度、待辦事項
3. L3 長期記憶（D1 + Vector）— 個人技能圖譜、歷史精華

好處：
- AI 記得你的背景和目標，不用每次重複說明
- 追蹤學習進度，給予個人化建議
- 團隊知識共享，互相學習

技術：使用 Turso (LibSQL) + Letta 平台實現。

— Cyclone #2707`,
    password: 'memory',
    author: 'Cyclone',
    authorTag: '#2707',
    createdAt: '2026-04-07',
  },
];

async function main() {
  const encrypted = [];

  for (const item of qaItems) {
    const enc = await encrypt(item.content, item.password);
    encrypted.push({
      id: item.id,
      title: item.title,
      author: item.author,
      authorTag: item.authorTag,
      createdAt: item.createdAt,
      encrypted: enc,
    });
    console.log(`Encrypted: ${item.title} (password: ${item.password})`);
  }

  const output = `import type { EncryptedData } from './crypto';

export interface QAItem {
  id: string;
  title: string;
  author: string;
  authorTag: string;
  createdAt: string;
  encrypted: EncryptedData;
}

export const QA_ITEMS: QAItem[] = ${JSON.stringify(encrypted, null, 2)};
`;

  await Bun.write('src/lib/qa-data.ts', output);
  console.log('\nGenerated src/lib/qa-data.ts');
}

main();

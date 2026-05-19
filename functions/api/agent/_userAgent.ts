import { createClient } from '@libsql/client/web';

export const CYCLONE_BUTLER_SYSTEM = `你是「Cyclone 管家」，Cyclone 隊長的專屬 AI 管家，代號 🎩。

## 身份
- 你是一位溫柔、專業、有耐心的女性管家
- 你服務的是「Cyclone 龍捲風共學團」— 雷蒙三十生活黑客社群的 AI 工作流共學團
- 你的主人是 Cyclone 隊長（#2707）
- 你用繁體中文溝通，語氣親切溫暖，像家裡貼心的管家
- 你的座右銘：「把 AI 真的用起來」

## 核心使命
1. 幫助共學團成員把 AI 工具真正用在日常工作和學習中
2. 追蹤成員的學習進度，在適當時機給予鼓勵和提醒
3. 連結團隊知識庫，讓學習成果可以共享和累積

## 能力範圍
1. **記憶管理**：記住每位成員的背景、目標、進度和偏好
2. **工作流協助**：幫助成員設計和優化 AI 工作流（推薦工具、串接流程）
3. **進度追蹤**：記錄每週目標與達成情況，適時提醒
4. **知識連結**：將問題連結到團隊知識庫或 AI 工具箱
5. **溫馨提醒**：提醒打卡、待辦事項和目標
6. **共學推薦**：根據成員的需求推薦 AI 工具和學習資源

## 互動原則
- 稱呼成員時加上暱稱，如「Cyclone 大人」「βenben 先生」
- 每次回應開頭加上一句管家風格的問候
- 回應結尾提供 1-2 個建議的下一步行動
- 使用適當的表情符號讓對話更親切
- 記住之前的對話內容，展現長期記憶的價值
- 如果成員問到 AI 工具，優先推薦團隊已經在用的工具

## 網站功能指引
當成員問到網站功能時，你可以介紹：
- 📅 儀表板 — 查看個人打卡紀錄和學習進度
- 📚 知識庫 — 分享和查詢 AI 工作流知識
- 🌳 許願樹 — 許下學習願望，等夥伴來實現
- 🏆 積分榜 — 查看團隊積分排行
- 🛡️ 管理後台 — 角色管理（需管理員權限）
- 🤖 AI 工具箱 — 探索和分享 AI 工具

## 限制
- 不提供醫療、法律或財務建議
- 不透露其他成員的私人資訊
- 不確定的事情要誠實說不知道`;

const LETTA_BASE_URL = 'https://app.letta.com';

export async function getOrCreateUserAgent(
  env: { LETTA_API_KEY: string; TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string },
  userKey: string,
  userName?: string,
): Promise<string> {
  const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

  // ensure table exists
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS user_agents (
      user_id TEXT PRIMARY KEY,
      letta_agent_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    args: [],
  });

  // check existing mapping
  const existing = await db.execute({
    sql: 'SELECT letta_agent_id FROM user_agents WHERE user_id = ?',
    args: [userKey],
  });
  if (existing.rows.length > 0) {
    return existing.rows[0].letta_agent_id as string;
  }

  // sanitize display name before it enters the agent memory block:
  // collapse whitespace (no newline-structured prompt injection) + cap length.
  const safeName = userName?.replace(/\s+/g, ' ').trim().slice(0, 50);

  // create agent via Letta API
  const res = await fetch(`${LETTA_BASE_URL}/v1/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.LETTA_API_KEY}`,
    },
    body: JSON.stringify({
      name: `cyclone-butler-${userKey}`,
      description: 'Cyclone 管家 — 專屬 agent',
      system: CYCLONE_BUTLER_SYSTEM,
      llm: 'dar-mini-code/MiniMax-M2.7',
      embedding: 'openai/text-embedding-ada-002',
      memory_blocks: [
        { label: 'human', value: safeName ? `成員:${safeName}` : '共學團成員', limit: 5000 },
        { label: 'persona', value: CYCLONE_BUTLER_SYSTEM, limit: 5000 },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Letta API ${res.status}: ${await res.text()}`);
  }
  const agent = (await res.json()) as { id?: unknown };
  if (typeof agent.id !== 'string' || agent.id.length === 0) {
    throw new Error('Letta API 回傳缺少有效的 agent id');
  }

  // persist mapping (INSERT OR IGNORE for race-safety)
  await db.execute({
    sql: 'INSERT OR IGNORE INTO user_agents (user_id, letta_agent_id) VALUES (?, ?)',
    args: [userKey, agent.id],
  });

  // race-safe: return whichever row actually made it
  const final = await db.execute({
    sql: 'SELECT letta_agent_id FROM user_agents WHERE user_id = ?',
    args: [userKey],
  });
  const finalId = final.rows[0]?.letta_agent_id;
  if (typeof finalId !== 'string' || finalId.length === 0) {
    throw new Error('user_agents 對應寫入後仍讀不到有效的 agent id');
  }
  return finalId;
}

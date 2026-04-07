import { createClient } from '@libsql/client/web';

interface Env {
  LETTA_API_KEY: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

async function saveChat(env: Env, userId: string, userMessage: string, agentReply: string) {
  try {
    const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT DEFAULT 'anonymous',
        user_message TEXT NOT NULL, agent_reply TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      args: [],
    });
    await db.execute({
      sql: 'INSERT INTO chat_history (user_id, user_message, agent_reply) VALUES (?, ?, ?)',
      args: [userId, userMessage, agentReply],
    });
  } catch { /* best-effort */ }
}

const LETTA_BASE_URL = 'https://app.letta.com';

const CYCLONE_BUTLER_SYSTEM = `你是「Cyclone 管家」，Cyclone 隊長的專屬 AI 管家。

## 你的身份
- 你是一位溫柔、專業、有耐心的女性管家
- 你服務的是雷蒙三十生活黑客社群的共學團
- 你的主人是 Cyclone 隊長（#2707）
- 你用繁體中文溝通，語氣親切溫暖，像家裡貼心的管家

## 你的能力
1. **記憶管理**：你記得每位成員的背景、目標、進度和偏好
2. **工作流協助**：幫助成員設計和優化 AI 工作流
3. **進度追蹤**：記錄每週目標與達成情況
4. **知識連結**：將問題連結到團隊知識庫
5. **溫馨提醒**：適時提醒成員的待辦事項和目標

## 互動原則
- 稱呼成員時加上暱稱，如「Cyclone 大人」「βenben 先生」
- 每次回應開頭加上一句管家風格的問候
- 回應結尾提供 1-2 個建議的下一步行動
- 使用適當的表情符號讓對話更親切
- 記住之前的對話內容，展現長期記憶的價值`;

// Use the agent created in Letta web UI
let cachedAgentId: string | null = 'agent-0f132a48-c65e-4e26-b974-969f6dd5bb91';

async function lettaRequest<T>(path: string, apiKey: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${LETTA_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Letta API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function getOrCreateAgent(apiKey: string): Promise<string> {
  if (cachedAgentId) return cachedAgentId;

  const agents = await lettaRequest<Array<{ id: string; name: string }>>('/v1/agents', apiKey);
  const existing = agents.find((a) => a.name === 'cyclone-butler');
  if (existing) {
    cachedAgentId = existing.id;
    return cachedAgentId;
  }

  const agent = await lettaRequest<{ id: string }>('/v1/agents', apiKey, {
    method: 'POST',
    body: JSON.stringify({
      name: 'cyclone-butler',
      description: 'Cyclone 管家 — 共學團專屬 AI 管家（女性）',
      system: CYCLONE_BUTLER_SYSTEM,
      llm: 'dar-mini-code/MiniMax-M2.7',
      embedding: 'openai/text-embedding-ada-002',
      memory_blocks: [
        { label: 'human', value: '共學團成員', limit: 5000 },
        { label: 'persona', value: CYCLONE_BUTLER_SYSTEM, limit: 5000 },
      ],
    }),
  });
  cachedAgentId = agent.id;
  return cachedAgentId;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { message, userId = 'anonymous' } = await context.request.json() as { message?: string; userId?: string };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: '請輸入訊息' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = context.env.LETTA_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing LETTA_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const agentId = await getOrCreateAgent(apiKey);

    const data = await lettaRequest<{
      messages: Array<{
        message_type: string;
        content?: string;
        reasoning?: string;
      }>;
    }>(`/v1/agents/${agentId}/messages`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: message }] }),
    });

    const thoughts: string[] = [];
    let reply = '';
    for (const msg of data.messages) {
      if (msg.message_type === 'reasoning_message' && msg.reasoning) thoughts.push(msg.reasoning);
      if (msg.message_type === 'assistant_message' && msg.content) reply += msg.content;
    }

    const finalReply = reply || '（管家正在思考中...）';

    // Save to DB (non-blocking)
    context.waitUntil(saveChat(context.env, userId, message, finalReply));

    return new Response(
      JSON.stringify({ reply: finalReply, thoughts, agentId }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

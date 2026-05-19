import { createClient } from '@libsql/client/web';
import { getSessionUser } from '../../../src/lib/auth.ts';
import { getOrCreateUserAgent, CYCLONE_BUTLER_SYSTEM } from './_userAgent.ts';

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

/** Sync latest persona to Letta agent (fire-and-forget via waitUntil). */
async function syncPersona(apiKey: string, agentId: string): Promise<void> {
  try {
    await lettaRequest(`/v1/agents/${agentId}`, apiKey, {
      method: 'PATCH',
      body: JSON.stringify({ system: CYCLONE_BUTLER_SYSTEM }),
    });
  } catch (err) {
    console.error('[agent] persona sync failed:', err instanceof Error ? err.message : err);
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { message } = await context.request.json() as { message?: string };

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

    // Resolve session user early — used for both agent selection and chat saving
    const sessionUser = await getSessionUser(context.request, context.env);

    const userKey = sessionUser?.id ?? '__guest__';
    const agentId = await getOrCreateUserAgent(context.env, userKey, sessionUser?.name);

    // Sync persona in background — never blocks the chat response
    context.waitUntil(syncPersona(apiKey, agentId));

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

    // 隱私決策:只有登入成員的對話寫入可辨識歷史;匿名訪客可聊但不留紀錄。
    if (sessionUser) {
      context.waitUntil(saveChat(context.env, sessionUser.id, message, finalReply));
    }

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

const LETTA_BASE_URL = 'https://app.letta.com';

interface LettaConfig {
  apiKey: string;
}

interface LettaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LettaAgent {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface LettaSendResponse {
  messages: Array<{
    message_type: string;
    assistant_message?: string;
    internal_monologue?: string;
  }>;
}

export class LettaClient {
  private apiKey: string;

  constructor(config: LettaConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${LETTA_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Letta API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async listAgents(): Promise<LettaAgent[]> {
    return this.request<LettaAgent[]>('/v1/agents');
  }

  async createAgent(config: {
    name: string;
    description: string;
    system: string;
    model: string;
    embedding: string;
  }): Promise<LettaAgent> {
    return this.request<LettaAgent>('/v1/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: config.name,
        description: config.description,
        system: config.system,
        llm: config.model,
        embedding: config.embedding,
        memory_blocks: [
          { label: 'human', value: '共學團成員', limit: 5000 },
          { label: 'persona', value: config.system, limit: 5000 },
        ],
      }),
    });
  }

  async sendMessage(
    agentId: string,
    message: string,
  ): Promise<{ reply: string; thoughts: string[] }> {
    const data = await this.request<LettaSendResponse>(
      `/v1/agents/${agentId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          content: message,
        }),
      },
    );

    const thoughts: string[] = [];
    let reply = '';

    for (const msg of data.messages) {
      if (msg.internal_monologue) {
        thoughts.push(msg.internal_monologue);
      }
      if (msg.assistant_message) {
        reply += msg.assistant_message;
      }
    }

    return { reply: reply || '（管家正在思考中...）', thoughts };
  }

  async getMemory(agentId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(
      `/v1/agents/${agentId}/memory`,
    );
  }
}

// Cyclone 管家 system prompt
export const CYCLONE_BUTLER_SYSTEM = `你是「Cyclone 管家」，Cyclone 隊長的專屬 AI 管家。

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

export function createLettaClient(): LettaClient {
  const apiKey = import.meta.env.LETTA_API_KEY;
  if (!apiKey) {
    throw new Error('Missing LETTA_API_KEY');
  }
  return new LettaClient({ apiKey });
}

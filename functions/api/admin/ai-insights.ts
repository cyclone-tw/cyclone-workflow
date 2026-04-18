import { requireRole } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  GEMINI_API_KEY?: string;
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface AnalyticsPayload {
  activeUsers: { value: string; sessions: string; avgSessionDuration: string; bounceRate: string };
  pageviews30d: string;
  topPages: Array<{ path: string; views: string; users: string }>;
  trafficSources: Array<{ source: string; sessions: string; users: string }>;
}

function buildPrompt(data: AnalyticsPayload): string {
  const topPagesStr = data.topPages
    .slice(0, 5)
    .map((p) => `  - ${p.path}: ${p.views} 瀏覽, ${p.users} 用戶`)
    .join('\n');

  const trafficStr = data.trafficSources
    .slice(0, 5)
    .map((s) => `  - ${s.source}: ${s.sessions} 工作階段, ${s.users} 用戶`)
    .join('\n');

  return `你是 Cyclone TW（一個跑步社群平台）的數據分析顧問。根據以下 Google Analytics 近 7 日數據，用繁體中文提供 3-5 條具體、可執行的改善建議。

## 網站數據
- 活躍用戶：${data.activeUsers.value}
- 工作階段：${data.activeUsers.sessions}
- 平均工作階段時間：${data.activeUsers.avgSessionDuration} 秒
- 跳出率：${data.activeUsers.bounceRate}%
- 30 日總瀏覽量：${data.pageviews30d}

### 熱門頁面（近 7 日）
${topPagesStr}

### 流量來源（近 7 日）
${trafficStr}

## 輸出格式
每條建議包含：
1. **標題**：簡短描述（8 字以內）
2. **說明**：1-2 句話解釋為何這樣建議
3. **行動**：具體可以做的事

請直接輸出建議，不要有開頭引言。格式如下：

### 1. 標題
說明文字
→ 行動建議`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');

    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'GEMINI_API_KEY 未設定。請在 Cloudflare Pages 設定環境變數。',
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await context.request.json() as { analytics?: AnalyticsPayload };
    if (!body.analytics) {
      return new Response(JSON.stringify({ ok: false, error: '缺少 analytics 數據' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildPrompt(body.analytics);
    const geminiRes = await fetch(`${GEMINI_URL}?key=${context.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    if (geminiRes.status === 429) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Gemini API 用量已滿，請稍後再試。',
        quotaExceeded: true,
      }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return new Response(JSON.stringify({ ok: false, error: `Gemini API 錯誤: ${err}` }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const insights = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!insights) {
      return new Response(JSON.stringify({ ok: false, error: 'Gemini 未回傳有效內容' }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, insights }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

import { requireRole } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  GA4_SERVICE_ACCOUNT_KEY?: string; // JSON of service account key
  GA4_PROPERTY_ID?: string; // Numeric GA4 Property ID (e.g. "459274837")
}

// GA4 Data API proxy — fetches analytics data server-side to avoid CORS
// Requires a Service Account with Viewer role on the GA4 property
// Docs: https://developers.google.com/analytics/data/v1/
// IMPORTANT: GA4_PROPERTY_ID is the NUMERIC property ID (e.g. "459274837"), NOT the gtag.js Measurement ID (e.g. "G-WE3VKBPWJ9")
// This is configured via the GA4_PROPERTY_ID environment variable.
const GA4_BASE_URL = 'https://analyticsdata.googleapis.com/v1beta';

function getGa4PropertyId(env: Env): string {
  if (!env.GA4_PROPERTY_ID) {
    throw new Error('GA4_PROPERTY_ID 環境變數未設定。請在 Cloudflare Pages 設定 Numeric Property ID（如 459274837）。');
  }
  return env.GA4_PROPERTY_ID;
}

interface Ga4Response {
  rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
  rowCount?: number;
  metadata?: { currencyCode?: string; timeZone?: string };
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  auth_uri: string;
  token_uri: string;
}

// Generate a short-lived access token from a Service Account JWT
async function getGa4AccessToken(serviceAccountKey: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwtClaim = btoa(JSON.stringify({
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signInput = `${jwtHeader}.${jwtClaim}`;
  const keyData = serviceAccountKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signInput),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signInput}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const tokenData = await res.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error(`GA4 OAuth token error: ${tokenData.error ?? 'unknown'}`);
  }
  return tokenData.access_token;
}

async function ga4Request(propertyId: string, accessToken: string, path: string, body?: Record<string, unknown>): Promise<Ga4Response> {
  const url = `${GA4_BASE_URL}/properties/${propertyId}${path}`;
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 API error ${res.status}: ${text}`);
  }
  let data: Ga4Response;
  try {
    data = await res.json() as Ga4Response;
  } catch {
    throw new Error('GA4 API 回傳非 JSON 格式');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Helpers — extract metric values safely from PromiseSettledResult
// ---------------------------------------------------------------------------
function extractFirstMetric(report: PromiseSettledResult<Ga4Response>): string {
  if (report.status === 'rejected') return '0';
  const rows = report.value?.rows;
  if (!rows || rows.length === 0) return '0';
  return rows[0]?.metricValues?.[0]?.value ?? '0';
}

function extractMetric(report: PromiseSettledResult<Ga4Response>, idx: number): string {
  if (report.status === 'rejected') return '0';
  const rows = report.value?.rows;
  if (!rows || rows.length === 0) return '0';
  return rows[0]?.metricValues?.[idx]?.value ?? '0';
}

// ---------------------------------------------------------------------------
// GET /api/admin/analytics — site analytics data
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');

    const serviceAccountKeyStr = context.env.GA4_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKeyStr) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'GA4_SERVICE_ACCOUNT_KEY 環境變數未設定。請參考 wiki/Environment.md 設定 Service Account JSON。',
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    let serviceAccountKey: ServiceAccountKey;
    try {
      serviceAccountKey = JSON.parse(serviceAccountKeyStr) as ServiceAccountKey;
    } catch {
      return new Response(JSON.stringify({
        ok: false,
        error: 'GA4_SERVICE_ACCOUNT_KEY 格式錯誤，需為有效的 Service Account JSON。',
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    let accessToken: string;
    try {
      accessToken = await getGa4AccessToken(serviceAccountKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      return new Response(JSON.stringify({
        ok: false,
        error: `GA4 認證失敗：${msg}。請確認 Service Account 已啟用 Analytics Data API 並具備 GA4 資源的 Viewer 權限。`,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const propertyId = getGa4PropertyId(context.env);

    const results = await Promise.allSettled([
      ga4Request(propertyId, accessToken, '/reports:runReport', {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }],
      }),
      ga4Request(propertyId, accessToken, '/reports:runReport', {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'screenPageViews' }],
      }),
      ga4Request(propertyId, accessToken, '/reports:runReport', {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        limit: 10,
      }),
      ga4Request(propertyId, accessToken, '/reports:runReport', {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
    ]);

    const [activeUsers, sessions, topPages, trafficSources] = results;

    const analytics = {
      activeUsers: {
        value: extractFirstMetric(activeUsers),
        sessions: extractMetric(activeUsers, 1),
        avgSessionDuration: extractMetric(activeUsers, 2),
        bounceRate: extractMetric(activeUsers, 3),
      },
      pageviews30d: extractFirstMetric(sessions),
      topPages: (topPages.status === 'fulfilled' && topPages.value.rows ? topPages.value.rows : []).map((r) => ({
        path: r.dimensionValues?.[0]?.value ?? '/',
        views: r.metricValues?.[0]?.value ?? '0',
        users: r.metricValues?.[1]?.value ?? '0',
      })),
      trafficSources: (trafficSources.status === 'fulfilled' && trafficSources.value.rows ? trafficSources.value.rows : []).map((r) => ({
        source: r.dimensionValues?.[0]?.value ?? 'Unknown',
        sessions: r.metricValues?.[0]?.value ?? '0',
        users: r.metricValues?.[1]?.value ?? '0',
      })),
      error: activeUsers.status === 'rejected'
        ? 'GA4 API 無法連線，請確認 Service Account 已啟用 Analytics Data API'
        : null,
    };

    return new Response(JSON.stringify({ ok: true, analytics }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

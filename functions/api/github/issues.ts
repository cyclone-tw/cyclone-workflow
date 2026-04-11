interface Env {
  GITHUB_TOKEN?: string;
}

// Cache responses for 5 minutes to stay well under GitHub's 60 req/hr
// anonymous rate limit per Cloudflare edge IP.
const CACHE_TTL_SECONDS = 300;
const GITHUB_URL =
  'https://api.github.com/repos/cyclone-tw/cyclone-workflow/issues?state=open&sort=updated&direction=desc&per_page=30';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // Cloudflare Workers Cache API — key by a stable URL, not the incoming
    // request URL (so all callers share the same cached response).
    const cache = (caches as unknown as { default: Cache }).default;
    const cacheKey = new Request('https://cyclone.tw/_cache/github-issues', {
      method: 'GET',
    });

    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      // GitHub requires a non-empty User-Agent or returns 403.
      'User-Agent': 'cyclone-workflow',
    };

    if (context.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${context.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(GITHUB_URL, { headers });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ ok: false, error: `GitHub API error: ${res.status} ${text}` }),
        {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const data = await res.json() as Array<{
      id: number;
      number: number;
      title: string;
      body: string | null;
      state: string;
      labels: Array<{ name: string; color: string }>;
      user: { login: string; avatar_url: string } | null;
      created_at: string;
      updated_at: string;
      comments: number;
      html_url: string;
      pull_request?: unknown;
    }>;

    // Filter out pull requests (GitHub API returns PRs as issues)
    const issues = data
      .filter((item) => !item.pull_request)
      .map((item) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        body: item.body,
        state: item.state,
        labels: item.labels.map((l) => l.name),
        user: item.user?.login ?? 'unknown',
        avatar_url: item.user?.avatar_url ?? '',
        created_at: item.created_at,
        updated_at: item.updated_at,
        comments: item.comments,
        html_url: item.html_url,
      }));

    const response = new Response(JSON.stringify({ ok: true, issues }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });

    // Cache a clone for the edge (cache.put consumes the body).
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

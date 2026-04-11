interface Env {
  GITHUB_TOKEN?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'cyclone-workflow/1.0',
    };

    if (context.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${context.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      'https://api.github.com/repos/cyclone-tw/cyclone-workflow/issues?state=open&sort=updated&direction=desc&per_page=30',
      { headers }
    );

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ ok: false, error: `GitHub API error: ${res.status} ${text}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({ ok: true, issues }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

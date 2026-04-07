import { createClient } from '@libsql/client/web';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// GET single issue + comments
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id;
    const db = getDb(context.env);

    const issue = await db.execute({ sql: 'SELECT * FROM issues WHERE id = ?', args: [id as string] });
    if (!issue.rows.length) {
      return new Response(JSON.stringify({ error: 'Issue not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const comments = await db.execute({
      sql: 'SELECT * FROM issue_comments WHERE issue_id = ? ORDER BY created_at ASC',
      args: [id as string],
    });

    return new Response(JSON.stringify({ ok: true, issue: issue.rows[0], comments: comments.rows }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH update issue status
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id;
    const body = await context.request.json() as Record<string, string>;
    const db = getDb(context.env);

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (body.status) { updates.push('status = ?'); args.push(body.status); }
    if (body.resolved_version) { updates.push('resolved_version = ?'); args.push(body.resolved_version); }
    if (body.priority) { updates.push('priority = ?'); args.push(body.priority); }

    if (!updates.length) {
      return new Response(JSON.stringify({ error: 'Nothing to update' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(id as string);

    await db.execute({
      sql: `UPDATE issues SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST add comment
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id;
    const { author, author_tag, content } = await context.request.json() as Record<string, string>;

    if (!author?.trim() || !content?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫暱稱和留言內容' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);

    await db.execute({
      sql: 'INSERT INTO issue_comments (issue_id, author, author_tag, content) VALUES (?, ?, ?, ?)',
      args: [id as string, author.trim(), author_tag?.trim() || '', content.trim()],
    });

    await db.execute({
      sql: 'UPDATE issues SET comments_count = comments_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [id as string],
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

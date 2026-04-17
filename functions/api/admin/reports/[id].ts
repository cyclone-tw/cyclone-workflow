import { createClient } from '@libsql/client/web';
import { requireRole } from '../../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// DELETE /api/admin/reports/:id — 管理員處理/關閉檢舉
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');
    const reportId = parseInt(context.params.id ?? '', 10);

    if (!reportId || isNaN(reportId)) {
      return new Response(JSON.stringify({ ok: false, error: '無效的檢舉 ID' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);

    // 將檢舉標記為 resolved（軟刪除，不影響舉報記錄）
    const result = await db.execute({
      sql: 'UPDATE message_reports SET status = ? WHERE id = ? AND status = ?',
      args: ['resolved', reportId, 'pending'],
    });

    if (result.rowsAffected === 0) {
      return new Response(JSON.stringify({ ok: false, error: '檢舉不存在或已處理' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

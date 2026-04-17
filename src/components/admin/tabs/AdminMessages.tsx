import type { AdminMessage } from '../types';

interface Props {
  messages: AdminMessage[];
  total: number;
  loading: boolean;
  action: { id: number; loading: boolean } | null;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onTogglePinned: (id: number, pinned: number) => void;
  onLoadMore: () => void;
}

export default function AdminMessages({
  messages,
  total,
  loading,
  action,
  onDelete,
  onRestore,
  onTogglePinned,
  onLoadMore,
}: Props) {
  return (
    <section
      className="rounded-xl p-5"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          討論區管理
        </h3>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {messages.length} / {total} 則留言
        </span>
      </div>

      {messages.length === 0 && !loading ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
          尚無留言
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="pb-2 pr-3 font-medium">作者</th>
                <th className="pb-2 pr-3 font-medium">內容摘要</th>
                <th className="pb-2 pr-3 font-medium">分類</th>
                <th className="pb-2 pr-3 font-medium">時間</th>
                <th className="pb-2 pr-3 font-medium">狀態</th>
                <th className="pb-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => {
                const isDeleted = !!msg.deleted_at;
                const isPinned = msg.pinned === 1;
                const isActing = action?.id === msg.id;
                return (
                  <tr
                    key={msg.id}
                    className="border-b"
                    style={{ borderColor: 'var(--color-border)', opacity: isDeleted ? 0.6 : 1 }}
                  >
                    <td className="py-2 pr-3">
                      <span className="text-xs">{msg.author_name || msg.author || '未知'}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-xs truncate max-w-[200px] block">{msg.content}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-xs">{msg.category || '-'}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-xs whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {isPinned && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                            置頂
                          </span>
                        )}
                        {isDeleted ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">
                            已刪除
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500">
                            正常
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {isDeleted ? (
                          <button
                            onClick={() => onRestore(msg.id)}
                            disabled={isActing}
                            className="text-[10px] px-2 py-1 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isActing ? '復原中...' : '復原'}
                          </button>
                        ) : (
                          <button
                            onClick={() => onDelete(msg.id)}
                            disabled={isActing}
                            className="text-[10px] px-2 py-1 rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {isActing ? '刪除中...' : '刪除'}
                          </button>
                        )}
                        <button
                          onClick={() => onTogglePinned(msg.id, isPinned ? 0 : 1)}
                          disabled={isActing}
                          className="text-[10px] px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isActing ? '...' : isPinned ? '取消置頂' : '置頂'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <p className="text-sm text-center py-3" style={{ color: 'var(--color-text-muted)' }}>
          載入中...
        </p>
      )}

      {messages.length < total && !loading && (
        <div className="text-center mt-3">
          <button
            onClick={onLoadMore}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors hover:bg-[var(--color-bg-hover)]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            載入更多 ({messages.length} / {total})
          </button>
        </div>
      )}
    </section>
  );
}

import type { AdminReport } from '../types';

interface Props {
  reports: AdminReport[];
  total: number;
  loading: boolean;
  action: { id: number; loading: boolean } | null;
  onResolve: (id: number) => void;
  onLoadMore: () => void;
}

export default function AdminReports({
  reports,
  total,
  loading,
  action,
  onResolve,
  onLoadMore,
}: Props) {
  return (
    <section
      className="rounded-xl p-5"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          🚩 檢舉管理
        </h3>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {reports.length} / {total} 筆檢舉
        </span>
      </div>

      {reports.length === 0 && !loading ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
          尚無檢舉記錄
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="pb-2 pr-3 font-medium">留言作者</th>
                <th className="pb-2 pr-3 font-medium">留言摘要</th>
                <th className="pb-2 pr-3 font-medium">檢舉人</th>
                <th className="pb-2 pr-3 font-medium">原因</th>
                <th className="pb-2 pr-3 font-medium">時間</th>
                <th className="pb-2 pr-3 font-medium">狀態</th>
                <th className="pb-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep) => {
                const isPending = rep.status === 'pending';
                const isActing = action?.id === rep.id;
                return (
                  <tr
                    key={rep.id}
                    className="border-b"
                    style={{ borderColor: 'var(--color-border)', opacity: !isPending ? 0.6 : 1 }}
                  >
                    <td className="py-2 pr-3">
                      <span className="text-xs">{rep.message_author || '未知'}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-xs truncate max-w-[180px] block">
                        {rep.message_content?.slice(0, 30) || '（已刪除）'}...
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-xs">{rep.reporter_name || rep.reporter_id}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-xs truncate max-w-[150px] block" title={rep.reason}>
                        {rep.reason}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-xs whitespace-nowrap">
                        {new Date(rep.created_at).toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: isPending ? 'rgba(233,69,96,0.1)' : 'rgba(0,245,160,0.1)',
                          color: isPending ? '#E94560' : '#00F5A0',
                        }}
                      >
                        {isPending ? '待處理' : '已處理'}
                      </span>
                    </td>
                    <td className="py-2">
                      {isPending ? (
                        <button
                          onClick={() => onResolve(rep.id)}
                          disabled={isActing}
                          className="text-[10px] px-2 py-1 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {isActing ? '處理中...' : '標記已處理'}
                        </button>
                      ) : (
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          已結案
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reports.length < total && !loading && (
        <div className="text-center mt-3">
          <button
            onClick={onLoadMore}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors hover:bg-[var(--color-bg-hover)]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            載入更多 ({reports.length} / {total})
          </button>
        </div>
      )}
    </section>
  );
}

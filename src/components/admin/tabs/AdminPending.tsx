import type { AdminUser } from '../types';

interface Props {
  pendingUsers: AdminUser[];
  updating: string | null;
  onApprove: (userId: string) => void;
  onReject: (user: AdminUser) => void;
}

export default function AdminPending({ pendingUsers, updating, onApprove, onReject }: Props) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          待審核使用者
        </h2>
        {pendingUsers.length > 0 && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: '#E94560' }}
          >
            {pendingUsers.length}
          </span>
        )}
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        {pendingUsers.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            目前沒有待審核的使用者
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: '#9090B0' }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {u.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {u.email || '（無 email）'}
                  </div>
                </div>
                <button
                  onClick={() => onApprove(u.id)}
                  disabled={updating === u.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#00F5A0' }}
                >
                  核可
                </button>
                <button
                  onClick={() => onReject(u)}
                  disabled={updating === u.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'var(--color-bg-dark)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  拒絕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

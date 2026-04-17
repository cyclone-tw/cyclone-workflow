import type { AdminUser } from '../types';
import { ROLE_BADGE_COLORS, ROLE_LABELS, ROLE_LEVEL_ORDER } from '../shared';
import type { GroupRole } from '@/lib/constants';

interface Props {
  filtered: AdminUser[];
  search: string;
  onSearch: (s: string) => void;
  includeArchived: boolean;
  onToggleArchived: () => void;
  updating: string | null;
  currentUserId: string | undefined;
  onAdd: () => void;
  onEdit: (user: AdminUser) => void;
  onArchive: (user: AdminUser) => void;
  onRoleConfirm: (user: AdminUser, role: string, action: 'add' | 'remove') => void;
}

export default function AdminUsers({
  filtered,
  search,
  onSearch,
  includeArchived,
  onToggleArchived,
  updating,
  currentUserId,
  onAdd,
  onEdit,
  onArchive,
  onRoleConfirm,
}: Props) {
  return (
    <>
      {/* Member Management */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            成員管理
          </h2>
          <div className="flex items-center gap-2">
            <div
              className="relative"
            >
              <input
                type="text"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="搜尋成員..."
                className="pl-8 pr-3 py-1.5 rounded-lg text-sm"
                style={{
                  background: 'var(--color-bg-dark)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  width: '180px',
                }}
              />
              <span
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                🔍
              </span>
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={onToggleArchived}
                className="w-3.5 h-3.5 accent-[#6C63FF]"
              />
              含封存
            </label>
            <button
              onClick={onAdd}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              + 新增
            </button>
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left"
                  style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}
                >
                  <th className="px-4 py-3 font-medium">成員</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                  <th className="px-4 py-3 font-medium">角色</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isUpdating = updating === u.id;
                  const isArchived = !!u.archived_at;
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-[var(--color-overlay-neutral-weak)]"
                      style={{ borderBottom: '1px solid var(--color-border)', opacity: isArchived ? 0.5 : 1 }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: ROLE_BADGE_COLORS[u.roles[0]] || '#9090B0' }}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {u.name}
                            </span>
                            {isArchived && (
                              <span className="text-[10px]" style={{ color: '#E94560' }}>已封存</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                        {u.email || <span className="italic opacity-60">（未設定）</span>}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 && (
                            <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                              無角色
                            </span>
                          )}
                          {u.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: ROLE_BADGE_COLORS[role] || '#9090B0' }}
                            >
                              {ROLE_LABELS[role] || role}
                              <button
                                onClick={() => onRoleConfirm(u, role, 'remove')}
                                disabled={isUpdating || isArchived || (u.id === currentUserId && ['captain', 'tech', 'admin'].includes(role))}
                                className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                                title={
                                  u.id === currentUserId && ['captain', 'tech', 'admin'].includes(role)
                                    ? '不能移除自己的管理權限'
                                    : `移除 ${ROLE_LABELS[role] || role}`
                                }
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right min-w-0">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap max-w-[220px] ml-auto">
                          <select
                            className="text-xs px-2 py-1 rounded-lg
                              bg-[var(--color-bg-dark)] border border-[var(--color-border)]
                              text-[var(--color-text-secondary)] cursor-pointer
                              disabled:opacity-50"
                            disabled={isUpdating || isArchived}
                            value=""
                            onChange={(e) => {
                              const role = e.target.value as GroupRole;
                              if (role && !u.roles.includes(role)) {
                                onRoleConfirm(u, role, 'add');
                              }
                              e.target.value = '';
                            }}
                          >
                            <option value="" disabled>+ 角色</option>
                            {ROLE_LEVEL_ORDER.filter((r) => !u.roles.includes(r)).map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => onEdit(u)}
                            disabled={isUpdating || isArchived}
                            className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{
                              background: 'var(--color-bg-dark)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => onArchive(u)}
                            disabled={isUpdating || isArchived || u.id === currentUserId}
                            className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{
                              background: '#E9456020',
                              border: '1px solid #E9456040',
                              color: '#E94560',
                            }}
                            title={u.id === currentUserId ? '不能封存自己' : '封存成員'}
                          >
                            封存
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      找不到符合的成員
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Role Legend */}
      <section
        className="rounded-xl p-5"
        style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          角色階級說明
        </h3>
        <div className="flex flex-wrap gap-3 items-center">
          {ROLE_LEVEL_ORDER.map((role, i) => (
            <span key={role} className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: ROLE_BADGE_COLORS[role] }}
              >
                {ROLE_LABELS[role]}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                ({role})
              </span>
              {i < ROLE_LEVEL_ORDER.length - 1 && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  &gt;
                </span>
              )}
            </span>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          左側為較高等級。高等級角色自動擁有低等級的所有權限。
        </p>
      </section>
    </>
  );
}

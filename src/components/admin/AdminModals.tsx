import { Modal, ROLE_BADGE_COLORS, ROLE_LABELS } from './shared';
import AddMemberForm from './forms/AddMemberForm';
import EditMemberForm from './forms/EditMemberForm';
import type { AdminUser, RelatedCounts } from './types';

interface Props {
  addOpen: boolean;
  onCloseAdd: () => void;
  onCreateMember: (body: { name: string; email: string; role: string; discord_id: string }) => Promise<void>;
  onError: (msg: string) => void;

  editing: AdminUser | null;
  onCloseEdit: () => void;
  onUpdateMember: (userId: string, body: Record<string, string>) => Promise<void>;

  deleting: { user: AdminUser; relatedCounts: RelatedCounts | null; loading: boolean } | null;
  onCloseDelete: () => void;
  onConfirmArchive: (userId: string) => void;

  roleConfirm: { user: AdminUser; role: string; action: 'add' | 'remove' } | null;
  onCloseRole: () => void;
  onConfirmRole: (userId: string, role: string, action: 'add' | 'remove') => void;
}

export default function AdminModals({
  addOpen, onCloseAdd, onCreateMember, onError,
  editing, onCloseEdit, onUpdateMember,
  deleting, onCloseDelete, onConfirmArchive,
  roleConfirm, onCloseRole, onConfirmRole,
}: Props) {
  return (
    <>
      {/* Add Member Modal */}
      {addOpen && (
        <Modal title="新增成員" onClose={onCloseAdd}>
          <AddMemberForm
            onSubmit={async (body) => {
              try {
                await onCreateMember(body);
                onCloseAdd();
              } catch (err) {
                onError(err instanceof Error ? err.message : '新增失敗');
              }
            }}
            onCancel={onCloseAdd}
          />
        </Modal>
      )}

      {/* Edit Member Modal */}
      {editing && (
        <Modal title={`編輯：${editing.name}`} onClose={onCloseEdit}>
          <EditMemberForm
            user={editing}
            onSubmit={async (body) => {
              try {
                await onUpdateMember(editing.id, body);
                onCloseEdit();
              } catch (err) {
                onError(err instanceof Error ? err.message : '更新失敗');
              }
            }}
            onCancel={onCloseEdit}
          />
        </Modal>
      )}

      {/* Archive Confirm Modal */}
      {deleting && (
        <Modal title={`封存：${deleting.user.name}`} onClose={onCloseDelete}>
          {deleting.loading ? (
            <div className="py-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              載入關聯資料...
            </div>
          ) : (
            <>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                封存後該成員會從公開列表消失，session 也會被清除。可重新設為 active 恢復。
              </p>
              {deleting.relatedCounts && (
                <div
                  className="rounded-lg p-3 mb-4 text-xs space-y-1"
                  style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <div>關聯資料（封存後仍保留但會被過濾）：</div>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <span>打卡：{deleting.relatedCounts.checkins}</span>
                    <span>願望：{deleting.relatedCounts.wishes}</span>
                    <span>知識：{deleting.relatedCounts.knowledge}</span>
                    <span>按讚：{deleting.relatedCounts.likes}</span>
                    <span>Session：{deleting.relatedCounts.sessions}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onCloseDelete}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  style={{
                    background: 'var(--color-bg-dark)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => onConfirmArchive(deleting.user.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#E94560' }}
                >
                  確認封存
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Role Mutation Confirm Modal */}
      {roleConfirm && (
        <Modal
          title={roleConfirm.action === 'add' ? '確認指派角色' : '確認移除角色'}
          onClose={onCloseRole}
        >
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {roleConfirm.action === 'add' ? '將指派' : '將移除'}{' '}
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {roleConfirm.user.name}
            </span>{' '}
            的{' '}
            <span
              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: ROLE_BADGE_COLORS[roleConfirm.role] || '#9090B0' }}
            >
              {ROLE_LABELS[roleConfirm.role] || roleConfirm.role}
            </span>{' '}
            角色。
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onCloseRole}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: 'var(--color-bg-dark)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              取消
            </button>
            <button
              onClick={() => {
                const { user: u, role, action } = roleConfirm;
                onCloseRole();
                onConfirmRole(u.id, role, action);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              確認
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

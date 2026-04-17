import type { GroupRole } from '@/lib/constants';

export const ROLE_BADGE_COLORS: Record<string, string> = {
  captain: '#6C63FF',
  tech: '#00D9FF',
  admin: '#00F5A0',
  member: '#E94560',
  companion: '#A78BFA',
};

export const ROLE_LABELS: Record<string, string> = {
  captain: '隊長',
  tech: '技術維護',
  admin: '行政協作',
  member: '正式隊員',
  companion: '陪跑員',
};

export const ROLE_LEVEL_ORDER: GroupRole[] = ['captain', 'tech', 'admin', 'member', 'companion'];

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-xs font-medium mb-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export function FormStyles() {
  return (
    <style>{`
      .form-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        background: var(--color-bg-dark);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        font-size: 0.875rem;
      }
      .form-input:focus {
        outline: 2px solid var(--color-primary);
        outline-offset: -1px;
      }
    `}</style>
  );
}

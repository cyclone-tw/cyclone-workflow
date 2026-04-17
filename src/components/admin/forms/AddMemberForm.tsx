import { useState } from 'react';
import type { GroupRole } from '@/lib/constants';
import { ROLE_LEVEL_ORDER, ROLE_LABELS, FormField, FormStyles } from '../shared';

interface Props {
  onSubmit: (body: { name: string; email: string; role: string; discord_id: string }) => Promise<void>;
  onCancel: () => void;
}

export default function AddMemberForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<GroupRole>('member');
  const [discordId, setDiscordId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
          await onSubmit({ name: name.trim(), email: email.trim(), role, discord_id: discordId.trim() });
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-3"
    >
      <FormField label="姓名 / 暱稱 *">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="form-input"
          placeholder="Cyclone"
        />
      </FormField>
      <FormField label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="member@example.com（可留空）"
        />
      </FormField>
      <FormField label="Discord ID">
        <input
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          className="form-input"
          placeholder="#1234（選填）"
        />
      </FormField>
      <FormField label="角色">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as GroupRole)}
          className="form-input"
        >
          {ROLE_LEVEL_ORDER.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </FormField>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
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
          type="submit"
          disabled={submitting || !name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? '新增中...' : '新增'}
        </button>
      </div>
      <FormStyles />
    </form>
  );
}

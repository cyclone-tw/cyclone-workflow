import { useState } from 'react';
import { FormField, FormStyles } from '../shared';
import type { AdminUser } from '../types';

interface Props {
  user: AdminUser;
  onSubmit: (body: {
    name?: string;
    email?: string;
    discord_id?: string;
    display_name?: string;
    emoji?: string;
    color?: string;
    bio?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function EditMemberForm({ user: u, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(u.name);
  const [email, setEmail] = useState(u.email);
  const [discordId, setDiscordId] = useState(u.discord_id ?? '');
  const [displayName, setDisplayName] = useState(u.display_name ?? '');
  const [emoji, setEmoji] = useState(u.emoji ?? '');
  const [color, setColor] = useState(u.color ?? '#6C63FF');
  const [bio, setBio] = useState(u.bio ?? '');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
          await onSubmit({
            name: name.trim(),
            email: email.trim(),
            discord_id: discordId.trim(),
            display_name: displayName.trim(),
            emoji: emoji.trim(),
            color: color.trim(),
            bio: bio.trim(),
          });
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
        />
      </FormField>
      <FormField label="顯示名稱">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="form-input"
          placeholder="在團隊頁面顯示的暱稱"
        />
      </FormField>
      <FormField label="頭像 Emoji">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="form-input"
          placeholder="例如 🐣、🚀、🌟"
          maxLength={8}
        />
      </FormField>
      <FormField label="代表色">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="form-input w-12 h-10 p-1 cursor-pointer"
            style={{ background: 'var(--color-bg-dark)' }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="form-input flex-1"
            placeholder="#6C63FF"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
      </FormField>
      <FormField label="自我介紹">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="form-input resize-none"
          rows={3}
          placeholder="簡單介紹自己..."
        />
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
          {submitting ? '儲存中...' : '儲存'}
        </button>
      </div>
      <FormStyles />
    </form>
  );
}

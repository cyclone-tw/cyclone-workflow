import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import { timeAgo } from '@/lib/time';
import { ROLE_LEVEL } from '@/lib/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

type VoiceType = 'ai_inventory' | 'pain_point';

interface VoiceUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Voice {
  id: string;
  type: VoiceType;
  title: string;
  content: string;
  metadata: {
    tool_url?: string;
    rating?: number;
    price_model?: string;
    use_case?: string;
    category?: string;
  };
  createdAt: string;
  updatedAt: string;
  user: VoiceUser;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<VoiceType, { label: string; color: string; icon: string; desc: string }> = {
  ai_inventory: { label: 'AI 服務盤點', color: '#00D9FF', icon: '🤖', desc: '分享你訂閱或試用過的 AI 工具與心得' },
  pain_point: { label: '痛點回饋', color: '#E94560', icon: '📢', desc: '針對網站、活動或工具提出建議與回饋' },
};

const PRICE_OPTIONS = [
  { value: 'free', label: '免費' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid', label: '付費' },
];

const PAIN_CATEGORIES = [
  { value: 'website', label: '網站功能' },
  { value: 'event', label: '活動流程' },
  { value: 'tool', label: '工具使用' },
  { value: 'other', label: '其他' },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(10, 10, 26, 0.6)',
  border: '1px solid #2A2A4A',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.875rem',
  color: '#F0F0FF',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#9090B0',
  marginBottom: '0.375rem',
  letterSpacing: '0.02em',
};

function handleFocusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#6C63FF';
  e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)';
}

function handleFocusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#2A2A4A';
  e.target.style.boxShadow = 'none';
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(10, 10, 26, 0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(108, 99, 255, 0.15)',
};

const neonBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #00F5A0, #00D9FF)',
  color: '#0A0A1A',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  borderRadius: '0.75rem',
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  boxShadow: '0 4px 16px rgba(0, 245, 160, 0.25)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        fontWeight: 700,
        background: 'rgba(108,99,255,0.25)',
        color: '#B8B0FF',
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ─── VoiceModal ───────────────────────────────────────────────────────────────

function VoiceModal({
  voice,
  defaultType,
  onClose,
  onSaved,
}: {
  voice?: Voice | null;
  defaultType?: VoiceType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const isEdit = !!voice;
  const [type, setType] = useState<VoiceType>(voice?.type || defaultType || 'ai_inventory');
  const [title, setTitle] = useState(voice?.title || '');
  const [content, setContent] = useState(voice?.content || '');
  const [toolUrl, setToolUrl] = useState(voice?.metadata?.tool_url || '');
  const [rating, setRating] = useState<number>(voice?.metadata?.rating || 0);
  const [priceModel, setPriceModel] = useState(voice?.metadata?.price_model || '');
  const [useCase, setUseCase] = useState(voice?.metadata?.use_case || '');
  const [category, setCategory] = useState(voice?.metadata?.category || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      setError('請填寫標題和內容');
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (type === 'ai_inventory') {
      if (toolUrl.trim()) metadata.tool_url = toolUrl.trim();
      if (rating) metadata.rating = rating;
      if (priceModel) metadata.price_model = priceModel;
      if (useCase.trim()) metadata.use_case = useCase.trim();
    } else {
      if (category) metadata.category = category;
    }

    setSubmitting(true);
    setError('');
    try {
      if (isEdit) {
        const res = await fetch(`/api/member-voices/${voice!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, content: c, metadata }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '更新失敗');
      } else {
        const res = await fetch('/api/member-voices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, title: t, content: c, metadata }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '發表失敗');
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          ...glassStyle,
          borderRadius: '1rem',
          padding: '1.5rem',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F0F0FF', margin: 0 }}>
            {isEdit ? '編輯內容' : `發表${TYPE_CONFIG[type].label}`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9090B0', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {!isEdit && (
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
            {(['ai_inventory', 'pain_point'] as VoiceType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: 8,
                  border: type === t ? '2px solid #6C63FF' : '1px solid #2A2A4A',
                  background: type === t ? 'rgba(108,99,255,0.2)' : 'rgba(10,10,26,0.4)',
                  color: type === t ? '#F0F0FF' : '#9090B0',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>標題 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'ai_inventory' ? '工具名稱' : '簡短標題'}
            style={{ ...inputStyle, width: '100%' }}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
          />
        </div>

        {type === 'ai_inventory' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={labelStyle}>連結</label>
                <input
                  type="url"
                  value={toolUrl}
                  onChange={(e) => setToolUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ ...inputStyle, width: '100%' }}
                  onFocus={handleFocusIn}
                  onBlur={handleFocusOut}
                />
              </div>
              <div>
                <label style={labelStyle}>價格模式</label>
                <select
                  value={priceModel}
                  onChange={(e) => setPriceModel(e.target.value)}
                  style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                  onFocus={handleFocusIn}
                  onBlur={handleFocusOut}
                >
                  <option value="">請選擇</option>
                  {PRICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>評分</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: rating === n ? '2px solid #6C63FF' : '1px solid #2A2A4A',
                      background: rating === n ? 'rgba(108,99,255,0.2)' : 'rgba(10,10,26,0.4)',
                      color: rating === n ? '#F0F0FF' : '#9090B0',
                      cursor: 'pointer',
                      fontSize: '1rem',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>使用場景</label>
              <input
                type="text"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="例如：寫文案、做簡報、程式輔助..."
                style={{ ...inputStyle, width: '100%' }}
                onFocus={handleFocusIn}
                onBlur={handleFocusOut}
              />
            </div>
          </>
        )}

        {type === 'pain_point' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>分類</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
              onFocus={handleFocusIn}
              onBlur={handleFocusOut}
            >
              <option value="">請選擇</option>
              {PAIN_CATEGORIES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>內容 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === 'ai_inventory' ? '分享你的使用心得、優缺點比較...' : '詳細描述你的痛點或建議...'}
            rows={4}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
          />
        </div>

        {error && <p style={{ color: '#FF6B6B', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.625rem 1rem', borderRadius: '0.75rem', border: '1px solid #2A2A4A', background: 'transparent', color: '#9090B0', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !user}
            style={{ ...neonBtnStyle, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '儲存中...' : isEdit ? '儲存' : '發表'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ ...glassStyle, borderRadius: '1rem', padding: '1.5rem', maxWidth: 400, width: '100%' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F0F0FF', marginBottom: '0.75rem' }}>確認刪除</h3>
        <p style={{ color: '#9090B0', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          確定要刪除這則內容嗎？此操作無法復原。
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid #2A2A4A', background: 'transparent', color: '#9090B0', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            取消
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', border: 'none', background: '#FF4D4D', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? '刪除中...' : '刪除'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VoiceCard ────────────────────────────────────────────────────────────────

function VoiceCard({ voice, canEdit, onEdit, onDelete }: { voice: Voice; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const cfg = TYPE_CONFIG[voice.type];

  return (
    <div
      style={{
        ...glassStyle,
        borderRadius: '1rem',
        padding: '1.25rem',
        borderLeft: `3px solid ${cfg.color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px ${cfg.color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.25rem' }}>{cfg.icon}</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              background: `${cfg.color}20`,
              color: cfg.color,
              whiteSpace: 'nowrap',
            }}
          >
            {cfg.label}
          </span>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#9090B0', cursor: 'pointer', fontSize: '0.85rem' }}>✏️</button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#9090B0', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F0F0FF', lineHeight: 1.4, margin: 0 }}>
        {voice.title}
      </h3>

      {/* Metadata badges for AI inventory */}
      {voice.type === 'ai_inventory' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {voice.metadata.rating && (
            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(255,193,7,0.15)', color: '#FFC107', border: '1px solid rgba(255,193,7,0.3)' }}>
              {'⭐'.repeat(voice.metadata.rating)}
            </span>
          )}
          {voice.metadata.price_model && (
            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(0,217,255,0.15)', color: '#00D9FF', border: '1px solid rgba(0,217,255,0.3)' }}>
              {PRICE_OPTIONS.find(o => o.value === voice.metadata.price_model)?.label || voice.metadata.price_model}
            </span>
          )}
          {voice.metadata.use_case && (
            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(108,99,255,0.15)', color: '#B8B0FF', border: '1px solid rgba(108,99,255,0.3)' }}>
              {voice.metadata.use_case}
            </span>
          )}
        </div>
      )}

      {/* Metadata badge for pain point */}
      {voice.type === 'pain_point' && voice.metadata.category && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(233,69,96,0.15)', color: '#FF6B6B', border: '1px solid rgba(233,69,96,0.3)' }}>
            {PAIN_CATEGORIES.find(o => o.value === voice.metadata.category)?.label || voice.metadata.category}
          </span>
        </div>
      )}

      {/* Content */}
      <p style={{ fontSize: '0.85rem', color: '#9090B0', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {voice.content}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(108,99,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#9090B0' }}>
          <Avatar name={voice.user.name} avatarUrl={voice.user.avatarUrl} size={22} />
          <span>{voice.user.name}</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#606080' }}>{timeAgo(voice.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Main MemberVoiceBoard ────────────────────────────────────────────────────

export default function MemberVoiceBoard() {
  const { user, loading: authLoading } = useAuth();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<VoiceType>('ai_inventory');
  const [showCreate, setShowCreate] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Voice | null>(null);

  const fetchVoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/member-voices?type=${activeType}`);
      const data = await res.json();
      if (data.ok) setVoices(data.voices);
    } catch { /* ignore */ }
    setLoading(false);
  }, [activeType]);

  useEffect(() => { fetchVoices(); }, [fetchVoices]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/member-voices/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setDeleteTarget(null);
        fetchVoices();
      }
    } catch { /* ignore */ }
  };

  const canEditMap: Record<string, boolean> = {};
  for (const v of voices) {
    canEditMap[v.id] = !!user && (v.user.id === user.id || (ROLE_LEVEL[user.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0));
  }

  return (
    <div>
      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {(['ai_inventory', 'pain_point'] as VoiceType[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: activeType === t ? `1px solid ${TYPE_CONFIG[t].color}` : '1px solid #2A2A4A',
              background: activeType === t ? `${TYPE_CONFIG[t].color}15` : 'rgba(10,10,26,0.4)',
              color: activeType === t ? TYPE_CONFIG[t].color : '#9090B0',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>{TYPE_CONFIG[t].icon}</span>
            <span>{TYPE_CONFIG[t].label}</span>
          </button>
        ))}
      </div>

      {/* Info + create button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: '#9090B0', margin: 0 }}>
          {TYPE_CONFIG[activeType].desc}
        </p>
        {!authLoading && user && (
          <button onClick={() => setShowCreate(true)} style={neonBtnStyle}>
            + 發表內容
          </button>
        )}
      </div>

      {/* Voice list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9090B0' }}>載入中...</div>
      ) : voices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{TYPE_CONFIG[activeType].icon}</div>
          <p style={{ color: '#9090B0' }}>
            目前還沒有{TYPE_CONFIG[activeType].label}，成為第一個發表的人吧！
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {voices.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              canEdit={canEditMap[voice.id] || false}
              onEdit={() => setEditingVoice(voice)}
              onDelete={() => setDeleteTarget(voice)}
            />
          ))}
        </div>
      )}

      {/* CTA for non-logged in */}
      {!authLoading && !user && (
        <div
          style={{
            ...glassStyle,
            borderRadius: '1rem',
            padding: '2rem',
            marginTop: '1.5rem',
            textAlign: 'center',
            border: '1px dashed rgba(0,245,160,0.3)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎤</div>
          <p style={{ color: '#F0F0FF', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.375rem' }}>想分享你的 AI 工具心得或提出建議嗎？</p>
          <p style={{ color: '#9090B0', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            登入後即可發表內容，每次發表可獲得 +10 積分！
          </p>
          <a href="/api/auth/login" style={{ ...neonBtnStyle, display: 'inline-block', textDecoration: 'none' }}>
            登入開始分享
          </a>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <VoiceModal defaultType={activeType} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchVoices(); }} />
      )}
      {editingVoice && (
        <VoiceModal voice={editingVoice} onClose={() => setEditingVoice(null)} onSaved={() => { setEditingVoice(null); fetchVoices(); }} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

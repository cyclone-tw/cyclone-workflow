import { useState } from 'react';
import { useAuth } from '@/components/auth/useAuth';

type FormData = {
  bugType: string;
  bugPage: string;
  description: string;
  steps: string;
  screenshotUrl: string;
};

const initialFormData: FormData = {
  bugType: '',
  bugPage: '',
  description: '',
  steps: '',
  screenshotUrl: '',
};

const BUG_TYPES = [
  { value: '', label: '請選擇問題類型' },
  { value: '頁面顯示異常', label: '頁面顯示異常' },
  { value: '功能無法使用', label: '功能無法使用' },
  { value: '效能問題', label: '效能問題' },
  { value: '文字錯誤', label: '文字錯誤' },
  { value: '其他', label: '其他' },
];

const BUG_PAGES = [
  { value: '', label: '請選擇問題頁面' },
  { value: '首頁', label: '首頁' },
  { value: '儀表板', label: '儀表板' },
  { value: '團隊', label: '團隊' },
  { value: '知識庫', label: '知識庫' },
  { value: 'QA', label: 'QA' },
  { value: '管家', label: '管家' },
  { value: '許願樹', label: '許願樹' },
  { value: '其他', label: '其他' },
];

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '1.5rem'})`,
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s ease',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'var(--color-info-neon-bg)',
          border: '1px solid var(--color-status-open)',
          color: 'var(--color-info-neon-text)',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          backdropFilter: 'blur(12px)',
          whiteSpace: 'nowrap',
        }}
      >
        {message}
      </div>
    </div>
  );
}

export default function BugForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitted, setSubmitted] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [issueId, setIssueId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState('');
  const { user, loading: authLoading, login } = useAuth();

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '0.5rem',
    padding: '0.625rem 0.875rem',
    color: 'var(--color-text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '0.375rem',
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: '1.25rem',
  };

  function validate(): boolean {
    const newErrors: Partial<FormData> = {};
    if (!formData.bugType) newErrors.bugType = '請選擇問題類型';
    if (!formData.bugPage) newErrors.bugPage = '請選擇問題頁面';
    if (!formData.description.trim()) newErrors.description = '請描述你遇到的問題';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function buildDescription(): string {
    const parts = [formData.description];
    if (formData.steps.trim()) {
      parts.push('', '🔁 重現步驟：', formData.steps);
    }
    if (formData.screenshotUrl.trim()) {
      parts.push('', `🖼️ 截圖連結：${formData.screenshotUrl}`);
    }
    return parts.join('\n');
  }

  function showToast(message: string) {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Bug] ${formData.bugPage} — ${formData.bugType}`,
          description: buildDescription(),
          priority: 'medium',
          category: 'bug',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '提交失敗');
      }

      const data = await res.json();
      setIssueId(data.id || null);
      setSubmitted(true);
      showToast('Bug 回報已送出！');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setFormData(initialFormData);
    setErrors({});
    setSubmitted(false);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = 'var(--color-primary)';
    e.target.style.boxShadow = '0 0 0 3px rgba(108, 99, 255, 0.15)';
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = 'var(--color-border)';
    e.target.style.boxShadow = 'none';
  }

  if (submitted) {
    return (
      <>
        <div
          style={{
            background: 'var(--color-glass-bg)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-border)',
            borderRadius: '1rem',
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
            回報已送出！
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            感謝你的回報，我們會盡快處理！
          </p>
          {issueId && (
            <p style={{ marginBottom: '1.5rem' }}>
              <a
                href={`/issue`}
                style={{ color: 'var(--color-primary)', fontSize: '0.9rem', textDecoration: 'underline' }}
              >
                前往 Issue 追蹤頁面查看 →
              </a>
            </p>
          )}
          <button
            onClick={handleReset}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 2rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            再回報一個問題
          </button>
        </div>
        <Toast message="Bug 回報已送出！" visible={toastVisible} />
      </>
    );
  }

  if (!authLoading && !user) {
    return (
      <div
        className="rounded-xl p-8 flex flex-col items-center gap-4 text-center"
        style={{
          background: 'var(--color-glass-bg)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p className="text-3xl">🐛</p>
        <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          登入後即可回報 Bug
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          已有帳號的隊員才能提交 Bug 回報
        </p>
        <button
          onClick={login}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          🔐 登入
        </button>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--color-glass-bg)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border)',
          borderRadius: '1rem',
          padding: '2rem',
        }}
      >
        <h3
          className="text-base font-semibold mb-5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          🐛 回報 Bug
          {user && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
              以 {user.display_name || user.name} 發表
            </span>
          )}
        </h3>

        {/* 問題類型 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            問題類型 <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <select
            value={formData.bugType}
            onChange={(e) => setFormData({ ...formData, bugType: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              borderColor: errors.bugType ? 'var(--color-accent)' : 'var(--color-border)',
              cursor: 'pointer',
            }}
          >
            {BUG_TYPES.map((t) => (
              <option key={t.value} value={t.value} style={{ background: 'var(--color-bg-card)' }}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.bugType && (
            <p style={{ color: 'var(--color-accent)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.bugType}</p>
          )}
        </div>

        {/* 問題頁面 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            問題頁面 <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <select
            value={formData.bugPage}
            onChange={(e) => setFormData({ ...formData, bugPage: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              borderColor: errors.bugPage ? 'var(--color-accent)' : 'var(--color-border)',
              cursor: 'pointer',
            }}
          >
            {BUG_PAGES.map((p) => (
              <option key={p.value} value={p.value} style={{ background: 'var(--color-bg-card)' }}>
                {p.label}
              </option>
            ))}
          </select>
          {errors.bugPage && (
            <p style={{ color: 'var(--color-accent)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.bugPage}</p>
          )}
        </div>

        {/* 問題描述 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            問題描述 <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <textarea
            placeholder="請盡量詳細描述你遇到的問題..."
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              resize: 'vertical',
              borderColor: errors.description ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          />
          {errors.description && (
            <p style={{ color: 'var(--color-accent)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.description}</p>
          )}
        </div>

        {/* 重現步驟 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>重現步驟（選填）</label>
          <textarea
            placeholder={'1. 開啟某某頁面\n2. 點擊某某按鈕\n3. 看到某某錯誤'}
            rows={3}
            value={formData.steps}
            onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* 截圖連結 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>截圖連結（選填）</label>
          <input
            type="url"
            placeholder="請貼上圖片連結（Notion、Imgur 等）"
            value={formData.screenshotUrl}
            onChange={(e) => setFormData({ ...formData, screenshotUrl: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={inputStyle}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.875rem',
            color: 'var(--color-text-emphasis)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            marginTop: '0.5rem',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '0.9';
            (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '1';
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {submitting ? '送出中...' : '📤 送出回報'}
        </button>
        {submitError && (
          <p style={{ color: 'var(--color-accent)', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' }}>
            {submitError}
          </p>
        )}
      </form>
      <Toast message="Bug 回報已送出！" visible={toastVisible} />
    </>
  );
}

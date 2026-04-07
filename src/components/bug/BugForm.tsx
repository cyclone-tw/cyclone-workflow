import { useState } from 'react';

type FormData = {
  nickname: string;
  bugType: string;
  bugPage: string;
  description: string;
  steps: string;
  screenshotUrl: string;
};

const initialFormData: FormData = {
  nickname: '',
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
          background: 'rgba(0, 245, 160, 0.15)',
          border: '1px solid #00F5A0',
          color: '#00F5A0',
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
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#9090B0',
    marginBottom: '0.375rem',
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: '1.25rem',
  };

  function validate(): boolean {
    const newErrors: Partial<FormData> = {};
    if (!formData.nickname.trim()) newErrors.nickname = '請填寫回報者暱稱';
    if (!formData.bugType) newErrors.bugType = '請選擇問題類型';
    if (!formData.bugPage) newErrors.bugPage = '請選擇問題頁面';
    if (!formData.description.trim()) newErrors.description = '請描述你遇到的問題';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function formatReport(): string {
    const lines = [
      '🐛 Bug 回報',
      '═══════════════════════',
      `📝 回報者：${formData.nickname}`,
      `🔖 問題類型：${formData.bugType}`,
      `📄 問題頁面：${formData.bugPage}`,
      '',
      '📋 問題描述：',
      formData.description,
    ];
    if (formData.steps.trim()) {
      lines.push('', '🔁 重現步驟：', formData.steps);
    }
    if (formData.screenshotUrl.trim()) {
      lines.push('', `🖼️ 截圖連結：${formData.screenshotUrl}`);
    }
    lines.push('', `⏰ 回報時間：${new Date().toLocaleString('zh-TW')}`);
    return lines.join('\n');
  }

  function showToast(message: string) {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const report = formatReport();
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = report;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setSubmitted(true);
    showToast('已複製到剪貼簿！請貼到 Discord 頻道');
  }

  function handleReset() {
    setFormData(initialFormData);
    setErrors({});
    setSubmitted(false);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#6C63FF';
    e.target.style.boxShadow = '0 0 0 3px rgba(108, 99, 255, 0.15)';
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#2A2A4A';
    e.target.style.boxShadow = 'none';
  }

  if (submitted) {
    return (
      <>
        <div
          style={{
            background: 'rgba(18, 18, 42, 0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #2A2A4A',
            borderRadius: '1rem',
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F0F0FF', marginBottom: '0.75rem' }}>
            回報已複製！
          </h2>
          <p style={{ color: '#9090B0', marginBottom: '0.5rem' }}>
            內容已複製到剪貼簿，請貼到 Discord 的 Bug 回報頻道。
          </p>
          <p style={{ color: '#606080', fontSize: '0.85rem', marginBottom: '2rem' }}>
            感謝你的回報，我們會盡快處理！
          </p>
          <button
            onClick={handleReset}
            style={{
              background: 'linear-gradient(135deg, #6C63FF, #E94560)',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 2rem',
              color: '#F0F0FF',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            再回報一個問題
          </button>
        </div>
        <Toast message="已複製到剪貼簿！請貼到 Discord 頻道" visible={toastVisible} />
      </>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'rgba(18, 18, 42, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #2A2A4A',
          borderRadius: '1rem',
          padding: '2rem',
        }}
      >
        {/* 回報者暱稱 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            回報者暱稱 <span style={{ color: '#E94560' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="請輸入你的暱稱"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              borderColor: errors.nickname ? '#E94560' : '#2A2A4A',
            }}
          />
          {errors.nickname && (
            <p style={{ color: '#E94560', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.nickname}</p>
          )}
        </div>

        {/* 問題類型 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            問題類型 <span style={{ color: '#E94560' }}>*</span>
          </label>
          <select
            value={formData.bugType}
            onChange={(e) => setFormData({ ...formData, bugType: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              borderColor: errors.bugType ? '#E94560' : '#2A2A4A',
              cursor: 'pointer',
            }}
          >
            {BUG_TYPES.map((t) => (
              <option key={t.value} value={t.value} style={{ background: '#12122A' }}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.bugType && (
            <p style={{ color: '#E94560', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.bugType}</p>
          )}
        </div>

        {/* 問題頁面 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            問題頁面 <span style={{ color: '#E94560' }}>*</span>
          </label>
          <select
            value={formData.bugPage}
            onChange={(e) => setFormData({ ...formData, bugPage: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              borderColor: errors.bugPage ? '#E94560' : '#2A2A4A',
              cursor: 'pointer',
            }}
          >
            {BUG_PAGES.map((p) => (
              <option key={p.value} value={p.value} style={{ background: '#12122A' }}>
                {p.label}
              </option>
            ))}
          </select>
          {errors.bugPage && (
            <p style={{ color: '#E94560', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.bugPage}</p>
          )}
        </div>

        {/* 問題描述 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            問題描述 <span style={{ color: '#E94560' }}>*</span>
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
              borderColor: errors.description ? '#E94560' : '#2A2A4A',
            }}
          />
          {errors.description && (
            <p style={{ color: '#E94560', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.description}</p>
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
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #6C63FF, #E94560)',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.875rem',
            color: '#F0F0FF',
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
          📤 送出回報
        </button>
      </form>
      <Toast message="已複製到剪貼簿！請貼到 Discord 頻道" visible={toastVisible} />
    </>
  );
}

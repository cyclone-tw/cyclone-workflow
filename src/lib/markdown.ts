import DOMPurify from 'dompurify';

// ─── Tag & Attribute Whitelist ──────────────────────────────────────────────

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'a', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote', 'img',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'th', 'td', 'tr',
  'hr', 'del', 'input',
  'span', 'div',
];

const ALLOWED_ATTR = [
  'href', 'alt', 'title', 'class', 'target', 'rel',
  'checked', 'disabled', 'type', 'colspan', 'rowspan', 'align',
];

const FORBID_TAGS = ['script', 'iframe', 'style', 'form', 'textarea', 'button'];

// Block all on* event handler attributes globally (browser only)
if (typeof window !== 'undefined') {
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName?.startsWith('on')) {
      data.forceKeepAttr = false;
    }
  });
}

// ─── URL Sanitization ───────────────────────────────────────────────────────

const SAFE_PROTOCOLS = ['http:', 'https:'];

export function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.origin);
    if (!SAFE_PROTOCOLS.includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

export function sanitizeImgSrc(src: string | undefined): string {
  if (!src) return '';
  try {
    const parsed = new URL(src, window.location.origin);
    if (parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch {
    return '';
  }
}

// ─── Full Markdown Content Sanitization ─────────────────────────────────────

export function sanitizeMarkdown(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS,
    ALLOW_DATA_ATTR: false,
  });
}

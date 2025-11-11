/**
 * XSS Sanitization Utility for Admin Panel
 * DOMPurify kullanarak güvenli HTML sanitization
 */

// Client-side only - DOMPurify browser'da çalışır
let DOMPurify: any = null;

if (typeof window !== 'undefined') {
  try {
    DOMPurify = require('dompurify');
  } catch (error) {
    console.warn('⚠️ DOMPurify not available, using basic XSS protection');
  }
}

/**
 * HTML içeriğini sanitize et - Rich text için
 * DOMPurify kullanarak güvenli HTML oluşturur
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // DOMPurify yoksa fallback kullan
  if (!DOMPurify || typeof window === 'undefined') {
    return basicXSSEscape(html);
  }

  // DOMPurify ile sanitize et - Email template için daha fazla tag'e izin ver
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'strike', 'del', 'ins',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'blockquote', 'pre', 'code', 'samp', 'kbd', 'var',
      'a', 'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'hr', 'div', 'span', 'sub', 'sup', 'mark', 'small', 'abbr', 'cite',
      'b', 'i', 'q', 'time', 'style'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id',
      'target', 'rel', 'style', 'data-*', 'aria-*', 'role',
      'colspan', 'rowspan', 'scope', 'headers', 'align', 'valign',
      'border', 'cellpadding', 'cellspacing', 'bgcolor'
    ],
    ALLOW_DATA_ATTR: true,
    ALLOW_ARIA_ATTR: true,
    // Güvenli URL'ler
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Tehlikeli tag'leri yasakla
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'base'],
    // Tehlikeli attribute'ları yasakla
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
    SANITIZE_DOM: true
  });

  return clean;
}

/**
 * Plain text için sanitization
 */
export function sanitizePlainText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text.replace(/<[^>]*>/g, '');
  
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  return sanitized.trim();
}

/**
 * Basit XSS escape (fallback)
 */
function basicXSSEscape(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');
}


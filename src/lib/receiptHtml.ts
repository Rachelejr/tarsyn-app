// Builds the HTML of a payment receipt under the GROUP's name.
// UNIMUNITY only provides the tool: the receipt is issued by the group,
// so the group name (and logo when set) is the title and UNIMUNITY does
// not appear on the receipt.

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function buildReceiptHtml(opts: {
  groupName: string;
  logoUrl?: string;
  rows: [string, string][];
  showBadge?: boolean;
}): string {
  const logo = opts.logoUrl && /^https:\/\//.test(opts.logoUrl)
    ? '<img src="' + esc(opts.logoUrl) + '" alt="" style="max-height:56px;max-width:200px;display:block;margin:0 0 10px;"/>'
    : '';
  const rows = opts.rows
    .map(([label, value]) => '<p style="margin:6px 0;"><strong>' + esc(label) + ':</strong> ' + esc(value) + '</p>')
    .join('');
  // The group issues the receipt: no UNIMUNITY branding on it.
  void opts.showBadge;
  const badge = '';
  return '<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:32px;color:#4A1F38;">' +
    logo +
    '<h1 style="color:#4A1F38;font-size:22px;margin:0 0 2px;">' + esc(opts.groupName || 'Payment Receipt') + '</h1>' +
    '<p style="color:#8A7B6C;font-size:13px;margin:0 0 18px;text-transform:uppercase;letter-spacing:1px;">Payment Receipt</p>' +
    rows +
    '<hr style="border:none;border-top:1px solid #EAD9BE;margin-top:22px;"/>' +
    '<p style="font-size:11px;color:#8A7B6C;margin:8px 0 0;">Issued by ' + esc(opts.groupName) + '</p>' +
    badge +
    '</body></html>';
}

/**
 * Receipts created before group branding carry an app title
 * ("UNIMUNITY Payment Receipt", or "TARSYN Payment Receipt" from before the
 * rename) and a "Powered by UNIMUNITY/TARSYN" footer inside their data URL.
 * Rewrites such a receipt on the fly so it shows the group name instead.
 * Any other URL is returned unchanged.
 */
const LEGACY_TITLE = /<h2[^>]*>\s*(?:UNIMUNITY|TARSYN)(?:\s*(?:\u2122|&trade;|\(TM\)))?\s+Payment Receipt\s*<\/h2>/i;
const LEGACY_FOOTER = /<p[^>]*>\s*Powered by (?:UNIMUNITY|TARSYN)[^<]*<\/p>/gi;

export function rebrandLegacyReceiptUrl(url: string, groupName: string): string {
  if (!url || !groupName || !url.startsWith('data:text/html')) return url;
  const comma = url.indexOf(',');
  if (comma < 0) return url;
  let html: string;
  try { html = decodeURIComponent(url.slice(comma + 1)); } catch { return url; }
  if (!LEGACY_TITLE.test(html) && !/Powered by (?:UNIMUNITY|TARSYN)/i.test(html)) return url;
  html = html
    .replace(LEGACY_TITLE,
      '<h1 style="color:#4A1F38;font-size:22px;margin:0 0 2px;">' + esc(groupName) + '</h1>' +
      '<p style="color:#8A7B6C;font-size:13px;margin:0 0 18px;text-transform:uppercase;letter-spacing:1px;">Payment Receipt</p>')
    .replace(LEGACY_FOOTER, '<p style="font-size:11px;color:#8A7B6C;margin:8px 0 0;">Issued by ' + esc(groupName) + '</p>');
  return url.slice(0, comma + 1) + encodeURIComponent(html);
}

// Builds the HTML of a payment receipt under the GROUP's name.
// UNIMUNITY only provides the tool: the receipt is issued by the group,
// so the group name (and logo when set) is the title and UNIMUNITY does
// not appear on the receipt.

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** The app logo used as a watermark (absolute: receipts open outside the site). */
export const RECEIPT_WATERMARK_URL = 'https://unimunity.com/unimunity-logo-color.png';

/**
 * What a receipt shows for branding:
 * - plan WITH White Label: the group's logo if it set one, else its initial;
 * - plan WITHOUT White Label: the group's initial, with the app logo as a
 *   faint watermark (a logo kept from an old White Label plan is ignored).
 */
export function receiptBranding(planHasWhiteLabel: boolean, groupBrand?: { enabled?: boolean; logo?: string } | null): { logoUrl?: string; watermark: boolean } {
  if (!planHasWhiteLabel) return { logoUrl: undefined, watermark: true };
  return { logoUrl: groupBrand?.enabled !== false ? groupBrand?.logo || undefined : undefined, watermark: false };
}

export type ReceiptLine = { label: string; sub?: string; amount: number };
export type ReceiptSignature = { name: string; style?: 'name' | 'initials' };

/** "Marie Rachele Jecrois" -> "M.R.J." */
export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + '.').join('');
}

function money(n: number, currency: string): string {
  return (currency ? currency + ' ' : '') + (Number.isFinite(n) ? n.toFixed(2) : '0.00');
}

function prettyDate(iso: string): string {
  const d = new Date((iso || '').slice(0, 10) + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso || '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * A complete, printable receipt page issued by the group.
 * `lines` lists what was paid (one line per hand / week); `info` holds the
 * other details. `rows` is the old simple format, still accepted.
 */
export function buildReceiptHtml(opts: {
  groupName: string;
  logoUrl?: string;
  receiptNo?: string;
  issuedOn?: string;          // YYYY-MM-DD
  memberName?: string;
  memberCode?: string;        // TYN-ID
  info?: [string, string][];
  lines?: ReceiptLine[];
  currency?: string;
  status?: string;            // e.g. "Paid"
  signature?: ReceiptSignature;
  rows?: [string, string][];  // legacy simple receipt
  watermark?: boolean;        // faint UNIMUNITY logo behind the receipt (plans without White Label)
  showBadge?: boolean;        // ignored: no app branding on receipts
}): string {
  void opts.showBadge;
  const group = opts.groupName || 'Payment Receipt';
  const currency = opts.currency || '';
  const issued = opts.issuedOn || new Date().toISOString().slice(0, 10);
  const lines = opts.lines || [];
  const total = lines.reduce((t, l) => t + (Number(l.amount) || 0), 0);
  const info: [string, string][] = [
    ...(opts.memberName ? [['Member', opts.memberName + (opts.memberCode ? ' \u00b7 ' + opts.memberCode : '')] as [string, string]] : []),
    ...(opts.info || []),
    ...(opts.rows || []),
  ];

  // A logo sits on the light left part of the header, with no box behind it
  // (its own transparent background shows). Without a logo: bordeaux header.
  const hasLogo = !!(opts.logoUrl && /^https:\/\//.test(opts.logoUrl));
  const logo = hasLogo
    ? '<img class="logo" src="' + esc(opts.logoUrl) + '" alt=""/>'
    : '';

  const infoHtml = info.length
    ? '<div class="info">' + info.map(([k, v]) =>
        '<div><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>').join('') + '</div>'
    : '';

  const linesHtml = lines.length
    ? '<table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>' +
      lines.map(l => '<tr><td><b>' + esc(l.label) + '</b>' + (l.sub ? '<span class="sub">' + esc(l.sub) + '</span>' : '') +
        '</td><td class="r">' + esc(money(l.amount, currency)) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Total' + (lines.length > 1 ? ' \u00b7 ' + lines.length + ' items' : '') + '</td><td class="r">' +
      esc(money(total, currency)) + '</td></tr></tfoot></table>'
    : '';

  const sig = opts.signature && opts.signature.name.trim()
    ? (() => {
        const name = opts.signature!.name.trim();
        const mark = opts.signature!.style === 'initials' ? initialsOf(name) : name;
        return '<div class="sig"><div class="mark">' + esc(mark) + '</div><div class="line"></div>' +
          '<div class="who">' + esc(name) + ' \u00b7 Organizer</div>' +
          '<div class="when">Signed electronically on ' + esc(prettyDate(issued)) + '</div></div>';
      })()
    : '';

  // Plans without White Label: the app logo appears only as a faint
  // watermark behind the content, never as the receipt's own logo.
  const wm = opts.watermark
    ? '<img class="wm" src="' + RECEIPT_WATERMARK_URL + '" alt=""/>'
    : '';

  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(group) + ' - Receipt' + (opts.receiptNo ? ' ' + esc(opts.receiptNo) : '') + '</title>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box}body{margin:0;background:#FBEEDD;font-family:Inter,Arial,sans-serif;color:#3A2F1F;padding:36px 16px}' +
    '.rc{position:relative;max-width:640px;margin:0 auto;background:#fff;border:1px solid #F0E4D6;border-radius:22px;overflow:hidden;box-shadow:0 14px 44px rgba(107,45,78,.13)}' +
    '.top{background:linear-gradient(110deg,#FBEEDD 0%,#FBEEDD 30%,#9A5A78 46%,#6B2D4E 58%,#4A1F38 100%);padding:22px 30px;display:flex;align-items:center;justify-content:space-between;gap:16px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.top.plain{background:linear-gradient(135deg,#6B2D4E 0%,#4A1F38 100%)}.top.plain .brand{gap:0}' +
    '.brand{display:flex;align-items:center;gap:14px;min-width:0}' +
    '.logo{height:58px;width:auto;max-width:170px;object-fit:contain;display:block}' +
    '.brand .txt{padding-left:26px}.top.plain .txt{padding-left:0}' +
    '.mono{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#F3D58F,#E9C77B);color:#4A1F38;font-weight:800;font-size:22px;display:flex;align-items:center;justify-content:center}' +
    '.gname{color:#E9C77B;font-size:23px;font-weight:800;letter-spacing:.5px;line-height:1.15;background:linear-gradient(90deg,#E9C77B 0%,#FFF6E0 22%,#E9C77B 45%,#E9C77B 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.kind{color:rgba(251,238,221,.78);font-size:10.5px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;margin-top:3px}' +
    '.no{text-align:right;color:rgba(251,238,221,.8);font-size:11px;white-space:nowrap}.no b{display:block;color:#fff;font-size:14px;font-family:ui-monospace,Menlo,monospace;margin-top:2px}' +
    '.body{padding:26px 30px 8px}' +
    '.head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}' +
    '.date{font-size:12.5px;color:#8A7B6C}.date b{color:#4A1F38}' +
    '.status{background:#E9F3EC;color:#3F7D5C;border:1px solid #A9CDB8;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:999px}' +
    '.info{display:grid;grid-template-columns:1fr 1fr;gap:12px 20px;background:#FDF6EC;border:1px solid #F3E6D8;border-radius:14px;padding:14px 16px;margin-bottom:20px}' +
    '.k{display:block;font-size:10px;font-weight:700;color:#A08B7D;text-transform:uppercase;letter-spacing:.8px}.v{display:block;font-size:13.5px;font-weight:600;color:#3A2F1F;margin-top:2px;word-break:break-word}' +
    'table{width:100%;border-collapse:collapse;font-size:13.5px}th{font-size:10px;font-weight:700;color:#A08B7D;text-transform:uppercase;letter-spacing:.8px;text-align:left;padding:0 0 8px;border-bottom:1.5px solid #EAD9BE}' +
    'td{padding:11px 0;border-bottom:1px solid #F3E6D8;vertical-align:top}.r{text-align:right;white-space:nowrap}.sub{display:block;font-size:12px;color:#8A7B6C;margin-top:2px}' +
    'tfoot td{border:none;padding-top:14px;font-weight:800;color:#4A1F38;font-size:15px}tfoot td.r{font-size:19px}' +
    '.sig{margin:30px 0 6px auto;width:290px;max-width:100%;text-align:center}.mark{font-family:"Great Vibes","Segoe Script","Brush Script MT",cursive;font-size:32px;white-space:nowrap;color:#4A1F38;line-height:1.1;min-height:38px}' +
    '.line{height:1px;background:#4A1F38;opacity:.5;margin:4px 0 6px}.who{font-size:12px;font-weight:700;color:#4A1F38}.when{font-size:10.5px;color:#A08B7D;margin-top:2px}' +
    '.wm{position:absolute;left:50%;top:58%;width:72%;transform:translate(-50%,-50%) rotate(-18deg);opacity:.07;pointer-events:none;z-index:0}' +
    '.body,.foot{position:relative;z-index:1}' +
    '.foot{text-align:center;font-size:11px;color:#A08B7D;padding:16px 30px 22px;border-top:1px dashed #EAD9BE;margin-top:18px}' +
    '@media (max-width:520px){.top,.head{flex-direction:column;align-items:flex-start}.no{text-align:left}.info{grid-template-columns:1fr}.body{padding:20px}.sig{width:100%}}' +
    '@media print{body{background:#fff;padding:0}.rc{box-shadow:none;border:none;border-radius:0}.top{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
    '@media print{.wm{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
    '</style></head><body><div class="rc">' + wm +
    '<div class="top' + (hasLogo ? '' : ' plain') + '"><div class="brand">' + logo + '<div class="txt"><div class="gname">' + esc(group) + '</div><div class="kind">Payment receipt</div></div></div>' +
    (opts.receiptNo ? '<div class="no">Receipt no.<b>' + esc(opts.receiptNo) + '</b></div>' : '') + '</div>' +
    '<div class="body"><div class="head"><div class="date">Issued on <b>' + esc(prettyDate(issued)) + '</b></div>' +
    (opts.status ? '<div class="status">' + esc(opts.status) + '</div>' : '') + '</div>' +
    infoHtml + linesHtml + sig + '</div>' +
    '<div class="foot">Issued by ' + esc(group) + (opts.receiptNo ? ' \u00b7 ' + esc(opts.receiptNo) : '') + '</div>' +
    '</div></body></html>';
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

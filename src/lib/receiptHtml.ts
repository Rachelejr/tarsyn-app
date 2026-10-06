// Builds the HTML of a payment receipt under the GROUP's name.
// UNIMUNITY only provides the tool: the receipt is issued by the group,
// so the group name (and logo when set) is the title. The small
// "Powered by UNIMUNITY" line follows the White Label badge setting.

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
  const badge = opts.showBadge === false
    ? ''
    : '<p style="font-size:10px;color:#A08B7D;margin-top:14px;">Powered by UNIMUNITY</p>';
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

// Opens a stored document (receipt, upload) in a new tab.
//
// Receipts are saved as "data:text/html,..." URLs. Browsers refuse to open
// a data: URL as a new page from a link (blank tab until you refresh), so
// such a document is turned into a temporary blob: URL first, which opens
// right away. Any other URL (Firebase Storage, https) opens as is.

function toOpenableUrl(url: string): { href: string; temporary: boolean } {
  if (!url.startsWith('data:')) return { href: url, temporary: false };
  const comma = url.indexOf(',');
  if (comma < 0) return { href: url, temporary: false };
  const meta = url.slice(5, comma); // e.g. "text/html;charset=utf-8" or "application/pdf;base64"
  const isBase64 = /;base64/i.test(meta);
  const mime = meta.split(';')[0] || 'text/plain';
  try {
    let blob: Blob;
    if (isBase64) {
      const bin = atob(url.slice(comma + 1));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      blob = new Blob([bytes], { type: mime });
    } else {
      const text = decodeURIComponent(url.slice(comma + 1));
      blob = new Blob([text], { type: mime + (mime.startsWith('text/') ? ';charset=utf-8' : '') });
    }
    return { href: URL.createObjectURL(blob), temporary: true };
  } catch {
    return { href: url, temporary: false };
  }
}

/** Opens the document in a new tab; with print: true, opens the print dialog once loaded. */
export function openDocument(url: string, opts: { print?: boolean } = {}): void {
  if (!url) return;
  const { href, temporary } = toOpenableUrl(url);
  const w = window.open(href, '_blank');
  if (opts.print && w) {
    // Works for receipts (blob: URLs are same-origin); other origins ignore it.
    try { w.addEventListener('load', () => w.print()); } catch { /* cross-origin */ }
  }
  if (temporary) setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

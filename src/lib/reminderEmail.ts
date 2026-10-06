// Contribution reminder email, built on the server from the real dues.
// Shared by the weekly automatic reminder and the Send Reminder page.

import type { DuePeriod } from '@/lib/dues';

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function money(amount: number, currency: string) {
  return esc(currency) + ' ' + amount.toFixed(2);
}

export function reminderEmailHtml(opts: {
  groupName: string; logoUrl?: string; memberName: string; fromName?: string;
  unpaidPeriods: DuePeriod[]; amountPerPeriod: number; amountOwed: number; currency: string;
}): string {
  const header = opts.logoUrl && /^https:\/\//.test(opts.logoUrl)
    ? '<div style="text-align: center; margin-bottom: 20px;"><img src="' + esc(opts.logoUrl) + '" alt="' + esc(opts.groupName) + '" style="height: 48px; width: auto; max-width: 220px;" /></div>'
    : '<p style="text-align: center; margin: 0 0 20px; color: #4A1F38; font-size: 20px; font-weight: 800;">' + esc(opts.groupName) + '</p>';
  const shown = opts.unpaidPeriods.slice(0, 12);
  const rows = shown.map(p =>
    '<tr><td style="padding:6px 0;color:#4A1F38;font-size:13px;">' + esc(p.label) + '</td>' +
    '<td style="padding:6px 0;color:#7A5068;font-size:13px;text-align:right;">' + money(opts.amountPerPeriod, opts.currency) + '</td></tr>'
  ).join('');
  const more = opts.unpaidPeriods.length > shown.length
    ? '<tr><td colspan="2" style="padding:6px 0;color:#7A5068;font-size:12px;">+ ' + (opts.unpaidPeriods.length - shown.length) + ' more</td></tr>'
    : '';
  const intro = opts.fromName
    ? 'This is a reminder from ' + esc(opts.fromName) + ' (' + esc(opts.groupName) + ').'
    : 'This is a reminder from ' + esc(opts.groupName) + '.';
  return '<div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #FBEEDD; padding: 32px; border-radius: 16px;">' +
    header +
    '<h2 style="color: #6B2D4E; font-size: 19px; font-weight: 800; margin: 0 0 12px;">Hello ' + esc(opts.memberName) + '</h2>' +
    '<p style="color: #7A5068; font-size: 14px; margin: 0 0 16px;">' + intro + ' The following contribution' + (opts.unpaidPeriods.length > 1 ? 's are' : ' is') + ' not recorded as paid yet:</p>' +
    '<div style="background: white; border-radius: 12px; padding: 14px 18px; margin-bottom: 16px;">' +
    '<table style="width:100%;border-collapse:collapse;">' + rows + more +
    '<tr><td style="padding:10px 0 0;border-top:1px solid #EAD9BE;color:#4A1F38;font-size:14px;font-weight:800;">Total due (' + opts.unpaidPeriods.length + ' x ' + money(opts.amountPerPeriod, opts.currency) + ')</td>' +
    '<td style="padding:10px 0 0;border-top:1px solid #EAD9BE;color:#6B2D4E;font-size:16px;font-weight:800;text-align:right;">' + money(opts.amountOwed, opts.currency) + '</td></tr>' +
    '</table></div>' +
    '<p style="color: #7A5068; font-size: 12.5px; margin: 0;">If you already paid, please contact your organizer so they can record it. You can view your payment grid in your member space.</p>' +
    '</div>';
}

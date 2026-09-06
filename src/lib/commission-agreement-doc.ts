﻿// Builds a Word-openable (.doc) commission agreement document showing both
// the organizer's and the member's signature, so it can be dropped straight
// into the "documents" collection as an archive the member (and organizer)
// can preview/download/print. This is an HTML document served with the
// application/msword mime type - Word opens it directly - rather than a
// binary .docx, so it needs no extra document-generation library.
export interface CommissionTierLike {
  min: number;
  max: number | null;
  rate: number;
}

export interface BuildCommissionAgreementDocParams {
  groupName: string;
  memberName: string;
  memberSignedAt: Date;
  organizerName: string;
  organizerSignedAt: Date | null;
  tiers: CommissionTierLike[];
  currency: string;
}

function formatDateTime(d: Date): string {
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function buildCommissionAgreementDoc(p: BuildCommissionAgreementDocParams): { name: string; type: string; size: number; url: string } {
  const currency = p.currency || '';
  const tierRows = (p.tiers || []).map((t) => {
    const label = t.max === null ? `${t.min}+ ${currency}` : `${t.min} - ${t.max} ${currency}`;
    return (
      '<tr>' +
      '<td style="padding:8px 12px;border:1px solid #EAD9BE;">' + label + '</td>' +
      '<td style="padding:8px 12px;border:1px solid #EAD9BE;text-align:right;">' + t.rate + '%</td>' +
      '</tr>'
    );
  }).join('');

  const html =
    '<html><head><meta charset="utf-8"></head><body style="font-family:Georgia, \'Times New Roman\', serif;padding:36px;color:#4A1F38;max-width:680px;margin:0 auto;">' +
    '<h1 style="color:#6B2D4E;font-size:21px;margin:0 0 4px;">Organizer Commission Agreement</h1>' +
    '<p style="font-size:12px;color:#8A7A88;margin:0 0 18px;">Group: <strong>' + p.groupName + '</strong></p>' +
    '<p style="font-size:13px;line-height:1.6;margin:0 0 16px;">' +
    'This agreement confirms the commission structure applied to <strong>' + p.groupName + '</strong>. ' +
    'The commission below is deducted automatically before each payout is sent to the member receiving that cycle. ' +
    'Both the organizer and the member acknowledge and accept these terms.' +
    '</p>' +
    '<table style="border-collapse:collapse;width:100%;margin:0 0 28px;font-size:13px;">' +
    '<thead><tr>' +
    '<th style="padding:8px 12px;border:1px solid #EAD9BE;background:#FBEEDD;text-align:left;">Pool amount</th>' +
    '<th style="padding:8px 12px;border:1px solid #EAD9BE;background:#FBEEDD;text-align:right;">Commission</th>' +
    '</tr></thead><tbody>' + tierRows + '</tbody></table>' +
    '<table style="width:100%;font-size:13px;"><tr>' +
    '<td style="width:50%;vertical-align:top;padding-right:20px;">' +
    '<p style="margin:0;color:#8A7A88;font-size:10.5px;text-transform:uppercase;letter-spacing:0.05em;">Organizer signature</p>' +
    '<p style="margin:8px 0 0;font-style:italic;font-size:17px;border-bottom:1px solid #4A1F38;padding-bottom:5px;">' + p.organizerName + '</p>' +
    '<p style="margin:5px 0 0;font-size:11px;color:#8A7A88;">' + (p.organizerSignedAt ? 'Signed ' + formatDateTime(p.organizerSignedAt) : 'On file') + '</p>' +
    '</td>' +
    '<td style="width:50%;vertical-align:top;">' +
    '<p style="margin:0;color:#8A7A88;font-size:10.5px;text-transform:uppercase;letter-spacing:0.05em;">Member signature</p>' +
    '<p style="margin:8px 0 0;font-style:italic;font-size:17px;border-bottom:1px solid #4A1F38;padding-bottom:5px;">' + p.memberName + '</p>' +
    '<p style="margin:5px 0 0;font-size:11px;color:#8A7A88;">Signed ' + formatDateTime(p.memberSignedAt) + '</p>' +
    '</td>' +
    '</tr></table>' +
    '<hr style="margin-top:32px;border:none;border-top:1px solid #EAD9BE;"/>' +
    '<p style="font-size:10px;color:#8A7A88;">Powered by UNIMUNITY(TM) - A product of Ma Production Luxenn Zara LLC</p>' +
    '</body></html>';

  const url = 'data:application/msword;charset=utf-8,' + encodeURIComponent(html);
  return {
    name: 'Commission Agreement - ' + p.groupName + '.doc',
    type: 'application/msword',
    size: html.length,
    url,
  };
}

import QRCode from 'qrcode';

/** Build a UPI deep-link for QR / intent. */
export function buildUpiDeepLink(input: {
  upiId: string;
  payeeName?: string | null;
  amount?: number | null;
  note?: string | null;
}) {
  const params = new URLSearchParams();
  params.set('pa', input.upiId.trim());
  if (input.payeeName?.trim()) params.set('pn', input.payeeName.trim());
  if (input.amount != null && Number.isFinite(input.amount) && input.amount > 0) {
    params.set('am', input.amount.toFixed(2));
  }
  params.set('cu', 'INR');
  if (input.note?.trim()) params.set('tn', input.note.trim());
  return `upi://pay?${params.toString()}`;
}

export async function generateUpiQrDataUrl(deepLink: string) {
  return QRCode.toDataURL(deepLink, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

import fs from 'fs';
import path from 'path';

export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
export const PAYMENT_PROOF_DIR = path.join(UPLOADS_ROOT, 'payment-proofs');
export const UPI_QR_DIR = path.join(UPLOADS_ROOT, 'upi-qr');
export const WHATSAPP_DIR = path.join(UPLOADS_ROOT, 'whatsapp');

export function ensureUploadDirs() {
  for (const dir of [UPLOADS_ROOT, PAYMENT_PROOF_DIR, UPI_QR_DIR, WHATSAPP_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

/** Public URL path served by express.static at /uploads */
export function publicUploadUrl(subdir: 'payment-proofs' | 'upi-qr', filename: string) {
  return `/uploads/${subdir}/${filename}`;
}

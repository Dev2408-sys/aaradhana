import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { PAYMENT_PROOF_DIR, UPI_QR_DIR, ensureUploadDirs } from '../config/uploads';

ensureUploadDirs();

const IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function imageFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (!IMAGE_MIME.has(file.mimetype)) {
    cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    return;
  }
  cb(null, true);
}

function diskStorage(dest: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDirs();
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `${randomUUID()}${safeExt}`);
    },
  });
}

export const paymentProofUpload = multer({
  storage: diskStorage(PAYMENT_PROOF_DIR),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

export const upiQrUpload = multer({
  storage: diskStorage(UPI_QR_DIR),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFilter,
});

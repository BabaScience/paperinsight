import multer from 'multer';
import { env } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';

// Use memory storage - files are stored as buffers in memory
// and then uploaded to MinIO in the controller
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only PDF files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

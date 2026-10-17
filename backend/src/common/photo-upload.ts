import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';

export const photoUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Gunakan foto JPG, PNG, atau WEBP (maksimal 5 MB)',
        ),
        false,
      );
    }
    cb(null, true);
  },
};

export async function saveUploadedPhoto<T>(
  file: Express.Multer.File | undefined,
  save: (path: string) => Promise<T>,
): Promise<T> {
  if (!file) throw new BadRequestException('Foto wajib dipilih');
  const bytes = file.buffer;
  const extension = bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    ? 'jpg'
    : bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? 'png'
      : bytes.toString('ascii', 0, 4) === 'RIFF' &&
          bytes.toString('ascii', 8, 12) === 'WEBP'
        ? 'webp'
        : null;
  if (!extension)
    throw new BadRequestException(
      'Isi file bukan foto JPG, PNG, atau WEBP yang valid',
    );
  const directory = resolve(
    process.cwd(),
    process.env.UPLOAD_DIR || 'uploads',
    'photos',
  );
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  const diskPath = join(directory, filename);
  await writeFile(diskPath, bytes);
  try {
    return await save(`/uploads/photos/${filename}`);
  } catch (error) {
    await unlink(diskPath).catch(() => undefined);
    throw error;
  }
}

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';

type UploadedEventImageFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

type UploadKind =
  | 'cover'
  | 'banner'
  | 'thumbnail'
  | 'mobile-banner'
  | 'sector-map'
  | 'gallery'
  | 'event-image';

@Injectable()
export class UploadsService {
  private readonly uploadRoot = join(process.cwd(), 'uploads');
  private readonly eventUploadDir = join(this.uploadRoot, 'events');

  ensureUploadFolders() {
    if (!existsSync(this.eventUploadDir)) {
      mkdirSync(this.eventUploadDir, { recursive: true });
    }
  }

  normalizeKind(kind?: string): UploadKind {
    const normalized = String(kind || '')
      .trim()
      .toLowerCase();

    const allowedKinds: UploadKind[] = [
      'cover',
      'banner',
      'thumbnail',
      'mobile-banner',
      'sector-map',
      'gallery',
      'event-image',
    ];

    if (allowedKinds.includes(normalized as UploadKind)) {
      return normalized as UploadKind;
    }

    return 'event-image';
  }

  getExtension(file: UploadedEventImageFile) {
    const extensionFromName = extname(file.originalname || '').toLowerCase();

    const extensionByMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    if (extensionByMime[file.mimetype]) {
      return extensionByMime[file.mimetype];
    }

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(extensionFromName)) {
      return extensionFromName === '.jpeg' ? '.jpg' : extensionFromName;
    }

    throw new BadRequestException(
      'Formato de imagem inválido. Use JPG, PNG ou WEBP.',
    );
  }

  buildSafeBaseName(originalName: string) {
    const nameWithoutExtension = basename(
      originalName,
      extname(originalName),
    );

    const safeName = nameWithoutExtension
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .toLowerCase();

    return safeName || 'imagem-evento';
  }

  buildPublicBaseUrl(request: {
    protocol?: string;
    get?: (name: string) => string | undefined;
  }) {
    const protocol = request.protocol || 'http';
    const host = request.get?.('host') || 'localhost:3001';

    return `${protocol}://${host}`;
  }

  uploadEventImage({
    file,
    kind,
    request,
  }: {
    file?: UploadedEventImageFile;
    kind?: string;
    request: {
      protocol?: string;
      get?: (name: string) => string | undefined;
    };
  }) {
    this.ensureUploadFolders();

    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    const extension = this.getExtension(file);
    const normalizedKind = this.normalizeKind(kind);
    const safeBaseName = this.buildSafeBaseName(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const finalFilename = `${normalizedKind}-${safeBaseName}-${uniqueSuffix}${extension}`;
    const finalPath = join(this.eventUploadDir, finalFilename);

    try {
      renameSync(file.path, finalPath);
    } catch (error) {
      try {
        if (file.path && existsSync(file.path)) {
          unlinkSync(file.path);
        }
      } catch {
        // ignora limpeza quando o arquivo temporário já não existir
      }

      throw new InternalServerErrorException(
        'Não foi possível salvar a imagem.',
      );
    }

    const relativePath = `/uploads/events/${finalFilename}`;
    const publicBaseUrl = this.buildPublicBaseUrl(request);
    const url = `${publicBaseUrl}${relativePath}`;

    return {
      kind: normalizedKind,
      filename: finalFilename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: relativePath,
      url,
    };
  }
}
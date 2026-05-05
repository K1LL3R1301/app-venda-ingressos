import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UploadsService } from './uploads.service';

type UploadedEventImageFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

const uploadRoot = join(process.cwd(), 'uploads');
const eventUploadDir = join(uploadRoot, 'events');

if (!existsSync(eventUploadDir)) {
  mkdirSync(eventUploadDir, { recursive: true });
}

function eventImageFileFilter(
  _request: unknown,
  file: {
    mimetype?: string;
    originalname?: string;
  },
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!file?.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
    callback(
      new BadRequestException('Envie uma imagem JPG, PNG ou WEBP.'),
      false,
    );
    return;
  }

  callback(null, true);
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('event-image')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      dest: eventUploadDir,
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: eventImageFileFilter,
    }),
  )
  uploadEventImage(
    @UploadedFile() file: UploadedEventImageFile,
    @Body('kind') kind: string | undefined,
    @Req()
    request: {
      protocol?: string;
      get?: (name: string) => string | undefined;
    },
  ) {
    return this.uploadsService.uploadEventImage({
      file,
      kind,
      request,
    });
  }
}
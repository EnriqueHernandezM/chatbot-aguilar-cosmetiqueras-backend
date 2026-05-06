import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  async uploadBuffer(payload: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    tenantKey?: string;
  }) {
    const cloudName = this.getCloudinaryCloudName();
    const uploadPreset = this.getCloudinaryUploadPreset();

    if (!cloudName || !uploadPreset) {
      this.logger.warn('Cloudinary is not configured');
      return null;
    }

    const folder = this.buildFolderPath(payload.tenantKey);
    const base64File = payload.buffer.toString('base64');
    const dataUri = `data:${payload.contentType};base64,${base64File}`;
    const requestBody = new URLSearchParams();

    requestBody.append('file', dataUri);
    requestBody.append('upload_preset', uploadPreset);
    requestBody.append('public_id', this.sanitizePublicId(payload.filename));

    if (folder) {
      requestBody.append('folder', folder);
    }

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      requestBody.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (!response.data?.secure_url) {
      throw new Error('Cloudinary upload did not return secure_url');
    }

    return {
      url: String(response.data.secure_url),
      path: [folder, response.data.public_id].filter(Boolean).join('/'),
    };
  }

  private getCloudinaryCloudName() {
    return (
      process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ||
      ''
    );
  }

  private getCloudinaryUploadPreset() {
    return (
      process.env.CLOUDINARY_UPLOAD_PRESET?.trim() ||
      process.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() ||
      ''
    );
  }

  private getCloudinaryBaseFolder() {
    return (
      process.env.CLOUDINARY_FOLDER?.trim() ||
      process.env.VITE_CLOUDINARY_FOLDER?.trim() ||
      'messages'
    ).replace(/^\/+|\/+$/g, '');
  }

  private buildFolderPath(tenantKey?: string) {
    const baseFolder = this.getCloudinaryBaseFolder();
    const scope = this.sanitizePathSegment(
      tenantKey?.trim() || process.env.APP_STORAGE_SCOPE?.trim() || 'shared',
    );
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    return [baseFolder, scope, 'whatsapp', 'incoming', year, month]
      .map((segment) => this.sanitizePathSegment(segment))
      .filter(Boolean)
      .join('/');
  }

  private sanitizePathSegment(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9/_-]+/g, '-')
      .replace(/\/{2,}/g, '/')
      .replace(/^\/+|\/+$/g, '');
  }

  private sanitizePublicId(filename: string) {
    return filename
      .trim()
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

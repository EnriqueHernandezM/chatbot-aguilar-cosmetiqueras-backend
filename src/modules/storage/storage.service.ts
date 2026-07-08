import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { createHash } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  async uploadBuffer(payload: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    tenantKey?: string;
  }) {
    const config = this.getCloudinaryConfig();

    if (!config.cloudName) {
      this.logger.warn('Cloudinary is not configured');
      return null;
    }

    const assetFolder = this.buildFolderPath(payload.tenantKey);
    const publicId = this.sanitizePublicId(payload.filename);
    const base64File = payload.buffer.toString('base64');
    const dataUri = `data:${payload.contentType};base64,${base64File}`;
    const requestBody = new URLSearchParams();

    requestBody.append('file', dataUri);
    requestBody.append('public_id', publicId);

    if (assetFolder) {
      requestBody.append('asset_folder', assetFolder);
    }

    if (config.uploadPreset) {
      requestBody.append('upload_preset', config.uploadPreset);
    } else if (config.apiKey && config.apiSecret) {
      const timestamp = String(Math.floor(Date.now() / 1000));

      requestBody.append('timestamp', timestamp);
      requestBody.append('api_key', config.apiKey);
      requestBody.append(
        'signature',
        this.signCloudinaryParams(
          {
            asset_folder: assetFolder,
            public_id: publicId,
            timestamp,
          },
          config.apiSecret,
        ),
      );
    } else {
      this.logger.warn('Cloudinary upload credentials are not configured');
      return null;
    }

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
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
      path: [assetFolder, response.data.public_id].filter(Boolean).join('/'),
    };
  }

  private getCloudinaryCloudName() {
    return (
      process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ||
      this.getCloudinaryUrlConfig().cloudName ||
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

  private getCloudinaryConfig() {
    const urlConfig = this.getCloudinaryUrlConfig();

    return {
      cloudName: this.getCloudinaryCloudName(),
      uploadPreset: this.getCloudinaryUploadPreset(),
      apiKey:
        process.env.CLOUDINARY_API_KEY?.trim() ||
        process.env.VITE_CLOUDINARY_API_KEY?.trim() ||
        urlConfig.apiKey,
      apiSecret:
        process.env.CLOUDINARY_API_SECRET?.trim() ||
        process.env.VITE_CLOUDINARY_API_SECRET?.trim() ||
        urlConfig.apiSecret,
    };
  }

  private getCloudinaryUrlConfig() {
    const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();

    if (!cloudinaryUrl) {
      return {
        cloudName: '',
        apiKey: '',
        apiSecret: '',
      };
    }

    try {
      const parsedUrl = new URL(cloudinaryUrl);

      return {
        cloudName: parsedUrl.hostname,
        apiKey: decodeURIComponent(parsedUrl.username),
        apiSecret: decodeURIComponent(parsedUrl.password),
      };
    } catch {
      this.logger.warn('Invalid CLOUDINARY_URL');

      return {
        cloudName: '',
        apiKey: '',
        apiSecret: '',
      };
    }
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

  private signCloudinaryParams(
    params: Record<string, string | undefined>,
    apiSecret: string,
  ) {
    const signaturePayload = Object.entries(params)
      .filter(([, value]) => value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return createHash('sha1')
      .update(`${signaturePayload}${apiSecret}`)
      .digest('hex');
  }
}

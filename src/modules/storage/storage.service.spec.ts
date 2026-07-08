import axios from 'axios';

import { StorageService } from './storage.service';

jest.mock('axios');

describe('StorageService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const previousEnv = process.env;
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...previousEnv };
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_UPLOAD_PRESET;
    delete process.env.CLOUDINARY_URL;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    service = new StorageService();
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it('uploads images with an unsigned upload preset', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
    process.env.CLOUDINARY_UPLOAD_PRESET = 'incoming-images';
    mockedAxios.post.mockResolvedValue({
      data: {
        secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/x.jpg',
        public_id: 'messages/shared/whatsapp/incoming/x',
      },
    });

    const result = await service.uploadBuffer({
      buffer: Buffer.from('image-binary'),
      filename: 'client-image.jpg',
      contentType: 'image/jpeg',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
      expect.stringContaining('upload_preset=incoming-images'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );
    const requestBody = new URLSearchParams(
      String(mockedAxios.post.mock.calls[0][1]),
    );
    expect(requestBody.get('asset_folder')).toContain(
      'messages/shared/whatsapp',
    );
    expect(requestBody.get('display_name')).toBe('client-image');
    expect(requestBody.has('folder')).toBe(false);
    expect(result?.url).toBe(
      'https://res.cloudinary.com/demo-cloud/image/upload/x.jpg',
    );
  });

  it('uploads images with signed credentials from CLOUDINARY_URL', async () => {
    process.env.CLOUDINARY_URL =
      'cloudinary://api-key:api-secret@signed-cloud';
    mockedAxios.post.mockResolvedValue({
      data: {
        secure_url:
          'https://res.cloudinary.com/signed-cloud/image/upload/y.jpg',
        public_id: 'messages/shared/whatsapp/incoming/y',
      },
    });

    const result = await service.uploadBuffer({
      buffer: Buffer.from('image-binary'),
      filename: 'client-image.jpg',
      contentType: 'image/jpeg',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/signed-cloud/image/upload',
      expect.stringContaining('api_key=api-key'),
      expect.any(Object),
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('signature='),
      expect.any(Object),
    );
    const requestBody = new URLSearchParams(
      String(mockedAxios.post.mock.calls[0][1]),
    );
    expect(requestBody.get('asset_folder')).toContain(
      'messages/shared/whatsapp',
    );
    expect(requestBody.get('display_name')).toBe('client-image');
    expect(requestBody.has('folder')).toBe(false);
    expect(result?.url).toBe(
      'https://res.cloudinary.com/signed-cloud/image/upload/y.jpg',
    );
  });
});

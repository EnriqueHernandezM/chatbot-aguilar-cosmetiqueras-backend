import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Model, Types } from 'mongoose';

import { IncomingMessageNotificationPayload } from './interfaces/incoming-message-notification.interface';
import { FcmToken } from './schemas/fcm-token.schema';

type FirebaseCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: App | null = null;

  constructor(
    @InjectModel(FcmToken.name)
    private readonly fcmTokenModel: Model<FcmToken>,
  ) {}

  async saveFcmToken(
    userId: string,
    payload: {
      token: string;
      platform: string;
      deviceName?: string;
      userAgent?: string;
    },
  ) {
    const saved = await this.fcmTokenModel.findOneAndUpdate(
      { token: payload.token.trim() },
      {
        $set: {
          userId: new Types.ObjectId(userId),
          token: payload.token.trim(),
          platform: payload.platform.trim(),
          deviceName: payload.deviceName?.trim() || null,
          userAgent: payload.userAgent?.trim() || null,
          lastUsedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    return {
      id: String(saved._id),
      token: saved.token,
      platform: saved.platform,
      deviceName: saved.deviceName,
      userAgent: saved.userAgent,
      updatedAt: saved.updatedAt,
    };
  }

  async deleteFcmToken(userId: string, token: string) {
    const result = await this.fcmTokenModel.deleteOne({
      userId: new Types.ObjectId(userId),
      token: token.trim(),
    });

    return {
      deleted: (result.deletedCount ?? 0) > 0,
    };
  }

  async sendTestNotification(userId: string, token: string) {
    const cleanToken = token.trim();

    await this.fcmTokenModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        token: cleanToken,
      },
      {
        $set: {
          lastUsedAt: new Date(),
        },
      },
    );

    await this.sendToTokens([cleanToken], {
      data: {
        title: 'FCM conectado',
        body: 'La notificacion de prueba se envio correctamente.',
        type: 'test',
        icon: this.getNotificationAssetUrl('/pwa-192x192.png'),
        badge: this.getNotificationAssetUrl('/pwa-72x72.png'),
      },
    });

    return { sent: true };
  }

  async sendIncomingMessageNotification(
    payload: IncomingMessageNotificationPayload,
  ) {
    const tokenQuery = payload.assignedUserId
      ? { userId: new Types.ObjectId(payload.assignedUserId) }
      : {};

    const tokenDocuments = await this.fcmTokenModel
      .find(tokenQuery)
      .select('token')
      .lean();

    const tokens = tokenDocuments
      .map((item) => item.token?.trim())
      .filter(Boolean);

    if (!tokens.length) {
      return { sent: 0 };
    }

    const data: Record<string, string> = {
      title: `Nuevo mensaje de ${payload.phone}`,
      body: payload.preview,
      conversationId: payload.conversationId,
      phone: payload.phone,
      preview: payload.preview,
      icon: this.getNotificationAssetUrl('/pwa-192x192.png'),
      badge: this.getNotificationAssetUrl('/pwa-72x72.png'),
    };

    if (payload.handledBy === 'bot') {
      data.handledBy = 'bot';
    }

    await this.sendToTokens(tokens, {
      data,
    });

    return { sent: tokens.length };
  }

  private async sendToTokens(
    tokens: string[],
    message: {
      data: Record<string, string>;
    },
  ) {
    const firebaseApp = this.getFirebaseApp();

    if (!firebaseApp || !tokens.length) {
      return;
    }

    const response = await getMessaging(firebaseApp).sendEachForMulticast({
      tokens,
      ...message,
    });

    const invalidTokens: string[] = [];

    response.responses.forEach((result, index) => {
      if (!result.success && this.isTokenNotRegisteredError(result.error)) {
        invalidTokens.push(tokens[index]);
      }
    });

    if (invalidTokens.length) {
      await this.fcmTokenModel.deleteMany({
        token: { $in: invalidTokens },
      });
    }
  }

  private isTokenNotRegisteredError(error: unknown) {
    const code =
      (error as any)?.code ||
      (error as any)?.errorInfo?.code ||
      (error as any)?.details?.code;

    return (
      code === 'messaging/registration-token-not-registered' ||
      code === 'registration-token-not-registered'
    );
  }

  private getFirebaseApp() {
    if (this.firebaseApp) {
      return this.firebaseApp;
    }

    const credentials = this.getFirebaseCredentials();
    if (!credentials) {
      this.logger.warn('Firebase credentials are not configured');
      return null;
    }

    this.firebaseApp =
      getApps()[0] ||
      initializeApp({
        credential: cert(credentials),
      });

    return this.firebaseApp;
  }

  private getFirebaseCredentials(): FirebaseCredentials | null {
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: String(parsed.private_key || '').replace(/\\n/g, '\n'),
        };
      } catch (error) {
        this.logger.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON', error);
        return null;
      }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  private getNotificationAssetUrl(path: string) {
    const baseUrl =
      process.env.FRONTEND_URL?.trim() || process.env.PAGE_URL?.trim() || '';

    if (!baseUrl) {
      return path;
    }

    return `${baseUrl.replace(/\/+$/, '')}${path}`;
  }
}

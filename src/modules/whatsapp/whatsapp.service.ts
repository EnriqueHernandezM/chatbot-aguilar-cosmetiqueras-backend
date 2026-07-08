import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import { notifyMetaSendFailure } from 'src/common/utils/telegram-alerts/telegram-alerts.util';

export interface WhatsAppTenantContext {
  whatsapp?: {
    phoneNumberId?: string;
    accessToken?: string;
  };
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private messagesGraphApiUrl =
    process.env.WHATSAPP_MESSAGES_GRAPH_API_URL ||
    'https://graph.facebook.com/v19.0';
  private graphApiUrl =
    process.env.WHATSAPP_GRAPH_API_URL || 'https://graph.facebook.com/v22.0';

  async sendText(
    tenant: WhatsAppTenantContext,
    to: string,
    text: string,
    previewUrl = false,
  ) {
    try {
      const credentials = this.getCredentials(tenant);
      this.logger.log(
        `Sending WhatsApp text to ${to} using phoneNumberId ${credentials.phoneNumberId}`,
      );

      await axios.post(
        this.getMessagesApiUrl(credentials.phoneNumberId),
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: text,
            preview_url: previewUrl,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      this.logMetaError('sendText', error);
      await notifyMetaSendFailure('sendText', to, error);
      throw error;
    }
  }

  async sendImage(
    tenant: WhatsAppTenantContext,
    to: string,
    imageUrl: string,
    caption?: string,
  ) {
    try {
      const credentials = this.getCredentials(tenant);
      this.logger.log(
        `Sending WhatsApp image to ${to} using phoneNumberId ${credentials.phoneNumberId}`,
      );

      await axios.post(
        this.getMessagesApiUrl(credentials.phoneNumberId),
        {
          messaging_product: 'whatsapp',
          to,
          type: 'image',
          image: {
            link: imageUrl,
            caption,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        },
      );
    } catch (error) {
      this.logMetaError('sendImage', error);
      await notifyMetaSendFailure('sendImage', to, error);
      throw error;
    }
  }

  async getMediaMetadata(tenant: WhatsAppTenantContext, mediaId: string) {
    const credentials = this.getCredentials(tenant);
    this.logger.log(
      `Fetching WhatsApp media metadata ${mediaId} using phoneNumberId ${credentials.phoneNumberId}`,
    );

    const response = await axios.get(`${this.graphApiUrl}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    return response.data as {
      id: string;
      url?: string;
      mime_type?: string;
      sha256?: string;
      file_size?: number;
    };
  }

  async downloadMedia(tenant: WhatsAppTenantContext, mediaUrl: string) {
    const credentials = this.getCredentials(tenant);
    this.logger.log(
      `Downloading WhatsApp media using phoneNumberId ${credentials.phoneNumberId}`,
    );

    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    return {
      buffer: Buffer.from(response.data),
      contentType:
        String(response.headers['content-type'] || '').trim() || 'image/jpeg',
    };
  }

  private getMessagesApiUrl(phoneNumberId: string) {
    return `${this.messagesGraphApiUrl}/${phoneNumberId}/messages`;
  }

  private getCredentials(tenant: WhatsAppTenantContext) {
    const phoneNumberId = tenant.whatsapp?.phoneNumberId?.trim();
    const accessToken = tenant.whatsapp?.accessToken?.trim();

    if (!phoneNumberId || !accessToken) {
      throw new Error('Tenant WhatsApp credentials are not configured');
    }

    return {
      phoneNumberId,
      accessToken,
    };
  }

  private logMetaError(action: string, error: any) {
    const metaError = error?.response?.data;
    const message =
      metaError?.error?.message || error?.message || 'Unknown WhatsApp error';

    this.logger.error(
      `WhatsApp ${action} failed: ${message}`,
      error?.stack,
    );

    if (metaError) {
      this.logger.error(`Meta response: ${JSON.stringify(metaError)}`);
    }
  }
}

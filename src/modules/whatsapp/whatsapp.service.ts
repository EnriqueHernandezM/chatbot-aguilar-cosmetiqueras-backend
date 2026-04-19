import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { notifyMetaSendFailure } from 'src/common/utils/telegram-alerts/telegram-alerts.util';

@Injectable()
export class WhatsAppService {
  private apiUrl = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

  async sendText(to: string, text: string) {
    try {
      console.log('TO:', to);
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: text,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      console.log('🔥 ERROR META COMPLETO:');
      console.log(JSON.stringify(error.response?.data, null, 2));
      await notifyMetaSendFailure('sendText', to, error);
      throw error;
    }
  }

  async sendImage(to: string, imageUrl: string, caption?: string) {
    try {
      await axios.post(
        this.apiUrl,
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
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          },
        },
      );
    } catch (error) {
      await notifyMetaSendFailure('sendImage', to, error);
      throw error;
    }
  }
}

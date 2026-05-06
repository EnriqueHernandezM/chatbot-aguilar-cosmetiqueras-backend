import { Injectable, Logger } from '@nestjs/common';
import { processIncomingMessage } from '../../common/utils/message-processor.util';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationFlowService } from '../flow/conversation-flow.service';

import { MessageFrom } from '../../common/enums/message-from.enum';
import { MessageType } from '../../common/enums/message-type.enum';
import { ConversationState } from 'src/common/enums/conversation-state.enum';
import { ConversationStatus } from 'src/common/enums/conversation-status.enum';
import { detectRegion } from 'src/common/utils/region.util';
import { notifyWaitingHumanNewMessage } from 'src/common/utils/telegram-alerts/telegram-alerts.util';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly modelsImageReplyDelayMs = 1500;

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly flowService: ConversationFlowService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  async processWebhook(payload: any) {
    let lockedConversationId: string | null = null;

    try {
      const messageData = this.extractMessage(payload);
      if (!messageData) return;

      const {
        waId,
        text,
        type,
        waMessageId,
        content,
        hasMultipleImages,
        imageId,
      } = messageData;

      // anti duplicado
      const exists = await this.messagesService.messageExists(waMessageId);

      if (exists) return;

      const conversation =
        await this.conversationsService.findOrCreateConversation(waId);

      const lockedConversation = await this.conversationsService.acquireLock(
        String(conversation._id),
      );

      if (!lockedConversation) {
        // otro proceso esta manejando esta conversacion
        return;
      }

      lockedConversationId = String(lockedConversation._id);

      if (hasMultipleImages) {
        const reply =
          'Por favor envia solo una imagen por mensaje para poder procesarla correctamente.';

        await this.messagesService.createMessage({
          conversationId: String(conversation._id),
          from: MessageFrom.BOT,
          type: MessageType.TEXT,
          content: reply,
        });

        await this.whatsappService.sendText(waId, reply);
        return;
      }

      const resolvedContent = await this.resolveIncomingContent({
        type,
        content,
        imageId,
      });

      // guardar mensaje usuario
      await this.messagesService.createMessage({
        conversationId: String(conversation._id),
        from: MessageFrom.USER,
        type,
        content: resolvedContent ?? text ?? '',
        waMessageId,
      });
      await this.notificationsService.sendIncomingMessageNotification({
        conversationId: String(conversation._id),
        phone: waId,
        preview: this.getIncomingMessagePreview(type, text),
        assignedUserId: conversation.assignedTo
          ? String(conversation.assignedTo)
          : undefined,
        handledBy:
          conversation.status === ConversationStatus.WAITING_HUMAN
            ? undefined
            : 'bot',
      });
      if (conversation.status === ConversationStatus.WAITING_HUMAN) {
        await notifyWaitingHumanNewMessage(
          waId,
          String(conversation._id),
          this.getIncomingMessagePreview(type, text),
        );

        return;
      }

      if (type === MessageType.IMAGE) {
        return;
      }

      // manejar multimedia
      if (type !== MessageType.TEXT) {
        const reply = `Por ahora solo puedo procesar mensajes de texto :)

Podrias escribir tu mensaje?`;

        await this.messagesService.createMessage({
          conversationId: String(conversation._id),
          from: MessageFrom.BOT,
          type: MessageType.TEXT,
          content: reply,
        });

        await this.whatsappService.sendText(waId, reply);
        return;
      }

      // FLOW ENGINE
      const flowResponse = await this.flowService.processMessage(
        conversation,
        text,
        waId,
      );

      if (!flowResponse) return;

      if (flowResponse.nextState) {
        await this.conversationsService.updateState(
          String(conversation._id),
          flowResponse.nextState,
        );
      }

      // enviar respuesta
      await this.whatsappService.sendText(waId, flowResponse.reply);

      // guardar mensaje bot
      await this.messagesService.createMessage({
        conversationId: String(conversation._id),
        from: MessageFrom.BOT,
        type: MessageType.TEXT,
        content: flowResponse.reply,
      });

      // acciones especiales
      if (flowResponse.nextState === ConversationState.SHOW_MODELS) {
        const region = detectRegion(waId);
        const imageEnvValue =
          region === 'monterrey'
            ? process.env.MODELS_IMAGE_MONTERREY
            : process.env.MODELS_IMAGE_NATIONAL;
        const imageUrls = this.getImageUrlsFromEnv(imageEnvValue);
        const pageUrl = process.env.PAGE_URL?.trim();

        // 1. Primero las imágenes
        for (const imageUrl of imageUrls) {
          await this.whatsappService.sendImage(waId, imageUrl);
          await this.delay(this.modelsImageReplyDelayMs);
        }

        // 2. Luego el texto + URL de la página
        if (pageUrl) {
          const pageIntroMessage =
            'Aquí puedes ver todos los colores y modelos disponibles 👇';

          await this.whatsappService.sendText(waId, pageIntroMessage);
          await this.messagesService.createMessage({
            conversationId: String(conversation._id),
            from: MessageFrom.BOT,
            type: MessageType.TEXT,
            content: pageIntroMessage,
          });

          // Delay antes de la URL para que WhatsApp genere el preview correctamente
          await this.delay(1000);

          await this.whatsappService.sendText(waId, pageUrl, true);
          await this.messagesService.createMessage({
            conversationId: String(conversation._id),
            from: MessageFrom.BOT,
            type: MessageType.TEXT,
            content: pageUrl,
          });
        }
      }

      if (flowResponse.additionalReplies?.length) {
        for (const reply of flowResponse.additionalReplies) {
          await this.whatsappService.sendText(waId, reply);

          await this.messagesService.createMessage({
            conversationId: String(conversation._id),
            from: MessageFrom.BOT,
            type: MessageType.TEXT,
            content: reply,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error processing webhook', error);
    } finally {
      if (lockedConversationId) {
        await this.conversationsService.releaseLock(lockedConversationId);
      }
    }
  }

  private extractMessage(payload: any) {
    try {
      const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;

      if (!Array.isArray(messages) || messages.length === 0) return null;

      const imageMessages = messages.filter((message) => !!message?.image);
      const message = messages[0];

      const waMessageId = message.id;
      const waId = message.from;

      const processed = processIncomingMessage(message);
      if (processed.isSupported === false) {
        this.logger.warn(
          `Skipping unsupported incoming WhatsApp message type: ${
            message?.type ?? 'unknown'
          }`,
        );
        return null;
      }

      return {
        waId,
        waMessageId,
        type: processed.type,
        text: processed.text,
        content: processed.content,
        imageId: processed.imageId,
        hasMultipleImages: imageMessages.length > 1,
      };
    } catch (error) {
      this.logger.error('Error parsing webhook', error);
      return null;
    }
  }

  private getIncomingMessagePreview(type: MessageType, text?: string) {
    if (type === MessageType.TEXT) {
      return text?.trim() || '[empty text]';
    }

    if (type === MessageType.IMAGE && text?.trim()) {
      return text.trim();
    }

    return `[${type}] Nuevo mensaje recibido`;
  }

  private async resolveIncomingContent({
    type,
    content,
    imageId,
  }: {
    type: MessageType;
    content?: string;
    imageId?: string;
  }) {
    if (type !== MessageType.IMAGE) {
      return content;
    }

    if (!imageId) {
      return content;
    }

    try {
      const mediaMetadata = await this.whatsappService.getMediaMetadata(
        imageId,
      );

      if (mediaMetadata.url?.trim()) {
        const uploadedImageUrl = await this.uploadWhatsAppImageToStorage({
          mediaUrl: mediaMetadata.url.trim(),
          mimeType: mediaMetadata.mime_type,
        });

        if (uploadedImageUrl) {
          return uploadedImageUrl;
        }

        return mediaMetadata.url.trim();
      }
    } catch (error) {
      this.logger.warn(
        `Could not resolve WhatsApp media URL for image ${imageId}`,
      );
    }

    return content ?? imageId;
  }

  private async uploadWhatsAppImageToStorage({
    mediaUrl,
    mimeType,
  }: {
    mediaUrl: string;
    mimeType?: string;
  }) {
    const downloadedMedia = await this.whatsappService.downloadMedia(mediaUrl);
    const contentType = mimeType?.trim() || downloadedMedia.contentType;
    const extension = this.getFileExtensionFromMimeType(contentType);
    const filename = `whatsapp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const uploadedFile = await this.storageService.uploadBuffer({
      buffer: downloadedMedia.buffer,
      filename,
      contentType,
    });

    return uploadedFile?.url || null;
  }

  private getFileExtensionFromMimeType(mimeType?: string) {
    const normalizedMimeType = mimeType?.trim().toLowerCase();

    switch (normalizedMimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/gif':
        return 'gif';
      default:
        return 'jpg';
    }
  }

  private getImageUrlsFromEnv(value?: string) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      return [];
    }

    if (trimmedValue.startsWith('[')) {
      try {
        const parsedValue = JSON.parse(trimmedValue);

        if (Array.isArray(parsedValue)) {
          return parsedValue
            .filter((imageUrl) => typeof imageUrl === 'string')
            .map((imageUrl) => imageUrl.trim())
            .filter(Boolean);
        }
      } catch (error) {
        this.logger.warn(`Invalid models image env array: ${trimmedValue}`);
        return [];
      }
    }

    return [trimmedValue];
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

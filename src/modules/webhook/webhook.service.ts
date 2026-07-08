import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { Tenant } from '../tenants/schemas/tenant.schema';

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
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<Tenant>,
  ) {}

  async processWebhook(payload: any) {
    let lockedConversationId: string | null = null;

    try {
      const messageData = this.extractMessage(payload);
      if (!messageData) {
        this.logger.warn('Webhook received without supported message data');
        return;
      }

      const {
        waId,
        text,
        type,
        waMessageId,
        content,
        hasMultipleImages,
        imageId,
        phoneNumberId,
      } = messageData;

      this.logger.log(
        `Webhook message received: type=${type}, waId=${waId}, waMessageId=${waMessageId}, phoneNumberId=${
          phoneNumberId ?? 'missing'
        }`,
      );

      const tenant = await this.resolveTenant(phoneNumberId);

      if (!tenant) return;

      const tenantId = tenant._id as Types.ObjectId;
      this.logger.log(
        `Webhook tenant resolved: tenantId=${String(
          tenantId,
        )}, phoneNumberId=${phoneNumberId}`,
      );

      // anti duplicado
      const exists = await this.messagesService.messageExists(
        waMessageId,
        tenantId,
      );

      if (exists) {
        this.logger.warn(
          `Skipping duplicated WhatsApp message: waMessageId=${waMessageId}`,
        );
        return;
      }

      const conversation =
        await this.conversationsService.findOrCreateConversation(
          waId,
          tenantId,
        );

      const lockedConversation = await this.conversationsService.acquireLock(
        String(conversation._id),
      );

      if (!lockedConversation) {
        // otro proceso esta manejando esta conversacion
        this.logger.warn(
          `Skipping locked conversation: conversationId=${String(
            conversation._id,
          )}`,
        );
        return;
      }

      lockedConversationId = String(lockedConversation._id);
      this.logger.log(
        `Webhook conversation locked: conversationId=${lockedConversationId}`,
      );

      if (hasMultipleImages) {
        const reply =
          'Por favor envia solo una imagen por mensaje para poder procesarla correctamente.';
        await this.messagesService.createMessage({
          tenantId,
          conversationId: String(conversation._id),
          from: MessageFrom.BOT,
          type: MessageType.TEXT,
          content: reply,
        });

        await this.whatsappService.sendText(tenant, waId, reply);
        return;
      }

      const resolvedContent = await this.resolveIncomingContent({
        tenant,
        type,
        content,
        imageId,
      });

      // guardar mensaje usuario
      await this.messagesService.createMessage({
        tenantId,
        conversationId: String(conversation._id),
        from: MessageFrom.USER,
        type,
        content: resolvedContent ?? text ?? '',
        waMessageId,
      });
      this.logger.log(
        `Incoming message persisted: conversationId=${String(
          conversation._id,
        )}, type=${type}`,
      );
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
        this.logger.log(
          `Conversation is waiting human, bot reply skipped: conversationId=${String(
            conversation._id,
          )}`,
        );
        await notifyWaitingHumanNewMessage(
          waId,
          String(conversation._id),
          this.getIncomingMessagePreview(type, text),
        );

        return;
      }

      if (type === MessageType.IMAGE) {
        this.logger.log(
          `Incoming image stored, flow skipped: conversationId=${String(
            conversation._id,
          )}`,
        );
        return;
      }

      // manejar multimedia
      if (type !== MessageType.TEXT) {
        const reply = `Por ahora solo puedo procesar mensajes de texto :)

Podrias escribir tu mensaje?`;

        await this.messagesService.createMessage({
          tenantId,
          conversationId: String(conversation._id),
          from: MessageFrom.BOT,
          type: MessageType.TEXT,
          content: reply,
        });

        await this.whatsappService.sendText(tenant, waId, reply);
        return;
      }

      // FLOW ENGINE
      const flowResponse = await this.flowService.processMessage(
        conversation,
        text,
        waId,
      );

      if (!flowResponse) {
        this.logger.warn(
          `Flow returned empty response: conversationId=${String(
            conversation._id,
          )}`,
        );
        return;
      }

      if (flowResponse.nextState) {
        await this.conversationsService.updateState(
          String(conversation._id),
          flowResponse.nextState,
        );
      }

      // enviar respuesta
      this.logger.log(
        `Sending bot flow reply: conversationId=${String(conversation._id)}`,
      );
      await this.whatsappService.sendText(tenant, waId, flowResponse.reply);

      // guardar mensaje bot
      await this.messagesService.createMessage({
        tenantId,
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
          await this.whatsappService.sendImage(tenant, waId, imageUrl);
          await this.delay(this.modelsImageReplyDelayMs);
        }

        // 2. Luego el texto + URL de la página
        if (pageUrl) {
          const pageIntroMessage =
            'Tenemos más colores y modelos disponibles aquí 👇';

          await this.whatsappService.sendText(tenant, waId, pageIntroMessage);
          await this.messagesService.createMessage({
            tenantId,
            conversationId: String(conversation._id),
            from: MessageFrom.BOT,
            type: MessageType.TEXT,
            content: pageIntroMessage,
          });

          // Delay antes de la URL para que WhatsApp genere el preview correctamente
          await this.delay(1000);

          await this.whatsappService.sendText(tenant, waId, pageUrl, true);
          await this.messagesService.createMessage({
            tenantId,
            conversationId: String(conversation._id),
            from: MessageFrom.BOT,
            type: MessageType.TEXT,
            content: pageUrl,
          });
        }
      }

      if (flowResponse.additionalReplies?.length) {
        for (const reply of flowResponse.additionalReplies) {
          await this.whatsappService.sendText(tenant, waId, reply);

          await this.messagesService.createMessage({
            tenantId,
            conversationId: String(conversation._id),
            from: MessageFrom.BOT,
            type: MessageType.TEXT,
            content: reply,
          });
        }
      }
    } catch (error) {
      this.logError('Error processing webhook', error);
    } finally {
      if (lockedConversationId) {
        await this.conversationsService.releaseLock(lockedConversationId);
        this.logger.log(
          `Webhook conversation lock released: conversationId=${lockedConversationId}`,
        );
      }
    }
  }

  private extractMessage(payload: any) {
    try {
      const value = payload.entry?.[0]?.changes?.[0]?.value;
      const messages = value?.messages;

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
        phoneNumberId: value?.metadata?.phone_number_id,
      };
    } catch (error) {
      this.logError('Error parsing webhook', error);
      return null;
    }
  }

  private async resolveTenant(phoneNumberId?: string) {
    const normalizedPhoneNumberId = phoneNumberId?.trim();

    if (!normalizedPhoneNumberId) {
      this.logger.warn('Skipping webhook without WhatsApp phone_number_id');
      return null;
    }

    const tenant = await this.tenantModel.findOne({
      'whatsapp.phoneNumberId': normalizedPhoneNumberId,
    });

    if (!tenant) {
      this.logger.warn(
        `Skipping webhook for unknown WhatsApp phone_number_id: ${normalizedPhoneNumberId}`,
      );
    }

    return tenant;
  }

  async isValidWebhookVerifyToken(token?: string) {
    const normalizedToken = token?.trim();

    if (!normalizedToken) {
      return false;
    }

    const tenant = await this.tenantModel.findOne({
      'whatsapp.webhookVerifyToken': normalizedToken,
    });

    return !!tenant;
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
    tenant,
    type,
    content,
    imageId,
  }: {
    tenant: Tenant;
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
        tenant,
        imageId,
      );

      if (mediaMetadata.url?.trim()) {
        const uploadedImageUrl = await this.uploadWhatsAppImageToStorage({
          tenant,
          mediaUrl: mediaMetadata.url.trim(),
          mimeType: mediaMetadata.mime_type,
        });

        if (uploadedImageUrl) {
          return uploadedImageUrl;
        }

        this.logger.warn(
          `Could not upload WhatsApp image ${imageId} to storage`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Could not resolve WhatsApp media URL for image ${imageId}: ${this.getErrorMessage(
          error,
        )}`,
      );
    }

    return content ?? imageId;
  }

  private async uploadWhatsAppImageToStorage({
    tenant,
    mediaUrl,
    mimeType,
  }: {
    tenant: Tenant;
    mediaUrl: string;
    mimeType?: string;
  }) {
    const downloadedMedia = await this.whatsappService.downloadMedia(
      tenant,
      mediaUrl,
    );
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

  private logError(message: string, error: any) {
    this.logger.error(
      `${message}: ${this.getErrorMessage(error)}`,
      error?.stack,
    );
  }

  private getErrorMessage(error: any) {
    return (
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      'Unknown error'
    );
  }
}

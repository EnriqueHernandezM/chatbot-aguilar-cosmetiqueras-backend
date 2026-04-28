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
  ) {}

  async processWebhook(payload: any) {
    let lockedConversationId: string | null = null;

    try {
      const messageData = this.extractMessage(payload);
      if (!messageData) return;

      const { waId, text, type, waMessageId } = messageData;

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

      // guardar mensaje usuario
      await this.messagesService.createMessage({
        conversationId: String(conversation._id),
        from: MessageFrom.USER,
        type,
        content: text || '',
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
        const imageUrl =
          region === 'monterrey'
            ? process.env.MODELS_IMAGE_MONTERREY
            : process.env.MODELS_IMAGE_NATIONAL;
        const pageUrl = process.env.PAGE_URL?.trim();

        if (pageUrl) {
          const pageMessage = `Puedes visitar nuestra pagina y ver todos los colores:\n${pageUrl}`;

          await this.whatsappService.sendText(waId, pageMessage);

          await this.messagesService.createMessage({
            conversationId: String(conversation._id),
            from: MessageFrom.BOT,
            type: MessageType.TEXT,
            content: pageMessage,
          });
        }

        if (imageUrl) {
          await this.whatsappService.sendImage(waId, imageUrl);
          await this.delay(this.modelsImageReplyDelayMs);
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
      const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message) return null;

      const waMessageId = message.id;
      const waId = message.from;

      const processed = processIncomingMessage(message);

      return {
        waId,
        waMessageId,
        type: processed.type,
        text: processed.text,
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

    return `[${type}] Nuevo mensaje recibido`;
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

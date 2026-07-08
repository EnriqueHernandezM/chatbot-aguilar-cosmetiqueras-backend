import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { MessageType } from 'src/common/enums/message-type.enum';
import { CreateMessagePayload } from './interfaces/create-message-payload.interface';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { MessageFrom } from 'src/common/enums/message-from.enum';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Tenant } from '../tenants/schemas/tenant.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<Tenant>,
    private readonly whatsappService: WhatsAppService,
  ) {}
  async messageExists(waMessageId: string, tenantId?: Types.ObjectId) {
    if (!waMessageId) return false;

    const query: Record<string, unknown> = {
      waMessageId,
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    const message = await this.messageModel.findOne(query);

    return !!message;
  }

  async createMessage(payload: CreateMessagePayload) {
    await this.findConversationOrFail(payload.conversationId, payload.tenantId);
    const messageType = this.resolveMessageType(payload);
    const normalizedContent = this.normalizeContent(
      messageType,
      payload.content,
    );

    const message = await this.messageModel.create({
      tenantId: payload.tenantId,
      conversationId: payload.conversationId,
      waMessageId: payload.waMessageId,
      from: payload.from,
      type: messageType,
      content: normalizedContent,
      internalNote: payload.internalNote ?? false,
    });
    const now = new Date();
    const update: Record<string, any> = {
      $max: { lastMessageAt: now },
    };

    if (payload.from === MessageFrom.AGENT) {
      update.$set = { lastReadAt: now };
    } else if (payload.from === MessageFrom.USER) {
      update.$inc = { unreadCount: 1 };
    }

    await this.conversationModel.updateOne(
      this.withTenant({ _id: payload.conversationId }, payload.tenantId),
      update,
    );

    return message;
  }

  async sendMessage(payload: CreateMessagePayload, tenantId?: string) {
    const tenantObjectId = tenantId ? new Types.ObjectId(tenantId) : undefined;
    const conversation = await this.findConversationOrFail(
      payload.conversationId,
      tenantObjectId,
    );
    const message = await this.createMessage({
      ...payload,
      tenantId: tenantObjectId ?? payload.tenantId,
    });

    const shouldSendToService =
      payload.from === MessageFrom.AGENT && !message.internalNote;

    if (!shouldSendToService) {
      return message;
    }

    const tenant = await this.findTenantOrFail(
      tenantObjectId ?? payload.tenantId ?? conversation.tenantId,
    );

    if (message.type === MessageType.TEXT) {
      await this.whatsappService.sendText(
        tenant,
        conversation.waId,
        this.getTextContent(message.content),
      );
    } else if (message.type === MessageType.IMAGE) {
      for (const imageUrl of this.getImageContent(message.content)) {
        await this.whatsappService.sendImage(
          tenant,
          conversation.waId,
          imageUrl,
        );
      }
    }

    return message;
  }

  async findByConversation(conversationId: string, tenantId: string) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      tenantId: tenantObjectId,
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.messageModel
      .find({ conversationId, tenantId: tenantObjectId })
      .sort({ createdAt: 1, _id: 1 });

    await this.conversationModel.updateOne(
      { _id: conversationId, tenantId: tenantObjectId },
      { $set: { lastReadAt: new Date(), unreadCount: 0 } },
    );

    return messages;
  }

  private async findConversationOrFail(
    conversationId: string,
    tenantId?: Types.ObjectId,
  ) {
    const conversation = await this.conversationModel.findOne(
      this.withTenant({ _id: conversationId }, tenantId),
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private async findTenantOrFail(tenantId?: Types.ObjectId) {
    if (!tenantId) {
      throw new NotFoundException('Tenant not found');
    }

    const tenant = await this.tenantModel.findById(tenantId);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  private withTenant(
    query: Record<string, unknown>,
    tenantId?: Types.ObjectId,
  ) {
    if (!tenantId) {
      return query;
    }

    return {
      ...query,
      tenantId,
    };
  }

  private resolveMessageType(payload: CreateMessagePayload) {
    return payload.type ?? payload.messageType ?? MessageType.TEXT;
  }

  private normalizeContent(type: MessageType, content: string | string[]) {
    if (type === MessageType.IMAGE) {
      return this.getImageContent(content);
    }

    return this.getTextContent(content);
  }

  private getTextContent(content: string | string[]) {
    if (typeof content !== 'string' || !content.trim()) {
      throw new BadRequestException(
        'Text messages require a non-empty string content',
      );
    }

    return content;
  }

  private getImageContent(content: string | string[]) {
    if (typeof content === 'string') {
      const trimmedContent = content.trim();

      if (!trimmedContent) {
        throw new BadRequestException(
          'Image messages require a non-empty image URL',
        );
      }

      if (trimmedContent.startsWith('[')) {
        try {
          const parsedContent = JSON.parse(trimmedContent);

          if (Array.isArray(parsedContent)) {
            return this.getImageContent(parsedContent);
          }
        } catch {
          throw new BadRequestException(
            'Image messages require valid image URLs',
          );
        }
      }

      return [trimmedContent];
    }

    if (!Array.isArray(content) || content.length === 0) {
      throw new BadRequestException(
        'Image messages require a non-empty array of image URLs',
      );
    }

    const invalidImageUrl = content.some(
      (imageUrl) => typeof imageUrl !== 'string' || !imageUrl.trim(),
    );

    if (invalidImageUrl) {
      throw new BadRequestException('Image messages require valid image URLs');
    }

    return content;
  }
}

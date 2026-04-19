import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './schemas/message.schema';
import { MessageType } from 'src/common/enums/message-type.enum';
import { CreateMessagePayload } from './interfaces/create-message-payload.interface';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { MessageFrom } from 'src/common/enums/message-from.enum';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    private readonly whatsappService: WhatsAppService,
  ) {}
  async messageExists(waMessageId: string) {
    if (!waMessageId) return false;

    const message = await this.messageModel.findOne({
      waMessageId,
    });

    return !!message;
  }

  async createMessage(payload: CreateMessagePayload) {
    await this.findConversationOrFail(payload.conversationId);
    const normalizedContent = this.normalizeContent(
      payload.type ?? MessageType.TEXT,
      payload.content,
    );

    const message = await this.messageModel.create({
      conversationId: payload.conversationId,
      waMessageId: payload.waMessageId,
      from: payload.from,
      type: payload.type ?? MessageType.TEXT,
      content: normalizedContent,
      internalNote: payload.internalNote ?? false,
    });
    const now = new Date();
    const update: Record<string, any> = {
      $max: { lastMessageAt: now },
    };

    if (payload.from === MessageFrom.AGENT) {
      update.$set = { lastReadAt: now };
    }

    await this.conversationModel.updateOne(
      { _id: payload.conversationId },
      update,
    );

    return message;
  }

  async sendMessage(payload: CreateMessagePayload) {
    const conversation = await this.findConversationOrFail(
      payload.conversationId,
    );
    const message = await this.createMessage(payload);

    const shouldSendToService =
      payload.from === MessageFrom.AGENT && !message.internalNote;

    if (!shouldSendToService) {
      return message;
    }

    if (message.type === MessageType.TEXT) {
      await this.whatsappService.sendText(
        conversation.waId,
        this.getTextContent(message.content),
      );
    } else if (message.type === MessageType.IMAGE) {
      for (const imageUrl of this.getImageContent(message.content)) {
        await this.whatsappService.sendImage(conversation.waId, imageUrl);
      }
    }

    return message;
  }

  async findByConversation(conversationId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1, _id: 1 });

    await this.conversationModel.updateOne(
      { _id: conversationId },
      { $set: { lastReadAt: new Date() } },
    );

    return messages;
  }

  private async findConversationOrFail(conversationId: string) {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
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

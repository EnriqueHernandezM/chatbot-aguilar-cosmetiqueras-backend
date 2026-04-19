import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { Message } from './schemas/message.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';

describe('MessagesService', () => {
  let service: MessagesService;
  let messageModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let conversationModel: {
    findById: jest.Mock;
    updateOne: jest.Mock;
  };
  let whatsappService: {
    sendText: jest.Mock;
    sendImage: jest.Mock;
  };

  beforeEach(async () => {
    messageModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    conversationModel = {
      findById: jest.fn(),
      updateOne: jest.fn(),
    };

    whatsappService = {
      sendText: jest.fn(),
      sendImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: messageModel,
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: conversationModel,
        },
        {
          provide: WhatsAppService,
          useValue: whatsappService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stores internal notes without sending them to WhatsApp', async () => {
    const conversation = { _id: 'conversation-id', waId: '5215551234567' };
    const createdMessage = {
      _id: 'message-id',
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      type: MessageType.TEXT,
      content: 'nota interna',
      internalNote: true,
    };

    conversationModel.findById.mockResolvedValue(conversation);
    messageModel.create.mockResolvedValue(createdMessage);
    conversationModel.updateOne.mockResolvedValue({ acknowledged: true });

    const result = await service.sendMessage({
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      content: 'nota interna',
      internalNote: true,
    });

    expect(messageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        internalNote: true,
      }),
    );
    expect(whatsappService.sendText).not.toHaveBeenCalled();
    expect(whatsappService.sendImage).not.toHaveBeenCalled();
    expect(result).toBe(createdMessage);
  });

  it('sends agent text messages to WhatsApp when internalNote is false', async () => {
    const conversation = { _id: 'conversation-id', waId: '5215551234567' };
    const createdMessage = {
      _id: 'message-id',
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      type: MessageType.TEXT,
      content: 'hola cliente',
      internalNote: false,
    };

    conversationModel.findById.mockResolvedValue(conversation);
    messageModel.create.mockResolvedValue(createdMessage);
    conversationModel.updateOne.mockResolvedValue({ acknowledged: true });
    whatsappService.sendText.mockResolvedValue(undefined);

    const result = await service.sendMessage({
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      content: 'hola cliente',
      internalNote: false,
    });

    expect(whatsappService.sendText).toHaveBeenCalledWith(
      '5215551234567',
      'hola cliente',
    );
    expect(result).toBe(createdMessage);
  });

  it('sends each image URL to WhatsApp when the message type is image', async () => {
    const conversation = { _id: 'conversation-id', waId: '5215551234567' };
    const imageUrls = [
      'https://example.com/image-1.jpg',
      'https://example.com/image-2.jpg',
    ];
    const createdMessage = {
      _id: 'message-id',
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      type: MessageType.IMAGE,
      content: imageUrls,
      internalNote: false,
    };

    conversationModel.findById.mockResolvedValue(conversation);
    messageModel.create.mockResolvedValue(createdMessage);
    conversationModel.updateOne.mockResolvedValue({ acknowledged: true });
    whatsappService.sendImage.mockResolvedValue(undefined);

    const result = await service.sendMessage({
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      type: MessageType.IMAGE,
      content: imageUrls,
      internalNote: false,
    });

    expect(whatsappService.sendImage).toHaveBeenCalledTimes(2);
    expect(whatsappService.sendImage).toHaveBeenNthCalledWith(
      1,
      '5215551234567',
      'https://example.com/image-1.jpg',
    );
    expect(whatsappService.sendImage).toHaveBeenNthCalledWith(
      2,
      '5215551234567',
      'https://example.com/image-2.jpg',
    );
    expect(result).toBe(createdMessage);
  });
});

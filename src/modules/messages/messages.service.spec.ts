import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { Message } from './schemas/message.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';
import { Tenant } from '../tenants/schemas/tenant.schema';

describe('MessagesService', () => {
  let service: MessagesService;
  let messageModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let conversationModel: {
    findOne: jest.Mock;
    updateOne: jest.Mock;
  };
  let tenantModel: {
    findById: jest.Mock;
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
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };

    tenantModel = {
      findById: jest.fn(),
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
          provide: getModelToken(Tenant.name),
          useValue: tenantModel,
        },
        {
          provide: WhatsAppService,
          useValue: whatsappService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    tenantModel.findById.mockResolvedValue({
      _id: 'tenant-id',
      whatsapp: {
        phoneNumberId: 'phone-number-1',
        accessToken: 'tenant-access-token',
      },
    });
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

    conversationModel.findOne.mockResolvedValue(conversation);
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

  it('increments unread count when storing an incoming user message', async () => {
    const conversation = { _id: 'conversation-id', waId: '5215551234567' };
    const createdMessage = {
      _id: 'message-id',
      conversationId: 'conversation-id',
      from: MessageFrom.USER,
      type: MessageType.TEXT,
      content: 'hola',
      internalNote: false,
    };

    conversationModel.findOne.mockResolvedValue(conversation);
    messageModel.create.mockResolvedValue(createdMessage);
    conversationModel.updateOne.mockResolvedValue({ acknowledged: true });

    const result = await service.createMessage({
      conversationId: 'conversation-id',
      from: MessageFrom.USER,
      content: 'hola',
    });

    expect(conversationModel.updateOne).toHaveBeenCalledWith(
      { _id: 'conversation-id' },
      {
        $max: { lastMessageAt: expect.any(Date) },
        $inc: { unreadCount: 1 },
      },
    );
    expect(result).toBe(createdMessage);
  });

  it('sends agent text messages to WhatsApp when internalNote is false', async () => {
    const conversation = {
      _id: 'conversation-id',
      tenantId: 'tenant-id',
      waId: '5215551234567',
    };
    const createdMessage = {
      _id: 'message-id',
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      type: MessageType.TEXT,
      content: 'hola cliente',
      internalNote: false,
    };

    conversationModel.findOne.mockResolvedValue(conversation);
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
      expect.objectContaining({
        whatsapp: expect.objectContaining({
          accessToken: 'tenant-access-token',
          phoneNumberId: 'phone-number-1',
        }),
      }),
      '5215551234567',
      'hola cliente',
    );
    expect(result).toBe(createdMessage);
  });

  it('sends each image URL to WhatsApp when the message type is image', async () => {
    const conversation = {
      _id: 'conversation-id',
      tenantId: 'tenant-id',
      waId: '5215551234567',
    };
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

    conversationModel.findOne.mockResolvedValue(conversation);
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
      expect.objectContaining({
        whatsapp: expect.objectContaining({
          accessToken: 'tenant-access-token',
          phoneNumberId: 'phone-number-1',
        }),
      }),
      '5215551234567',
      'https://example.com/image-1.jpg',
    );
    expect(whatsappService.sendImage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        whatsapp: expect.objectContaining({
          accessToken: 'tenant-access-token',
          phoneNumberId: 'phone-number-1',
        }),
      }),
      '5215551234567',
      'https://example.com/image-2.jpg',
    );
    expect(result).toBe(createdMessage);
  });

  it('accepts messageType as an alias of type for image messages', async () => {
    const conversation = {
      _id: 'conversation-id',
      tenantId: 'tenant-id',
      waId: '5215551234567',
    };
    const createdMessage = {
      _id: 'message-id',
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      type: MessageType.IMAGE,
      content: ['https://example.com/image-1.jpg'],
      internalNote: false,
    };

    conversationModel.findOne.mockResolvedValue(conversation);
    messageModel.create.mockResolvedValue(createdMessage);
    conversationModel.updateOne.mockResolvedValue({ acknowledged: true });
    whatsappService.sendImage.mockResolvedValue(undefined);

    const result = await service.sendMessage({
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      messageType: MessageType.IMAGE,
      content: 'https://example.com/image-1.jpg',
      internalNote: false,
    });

    expect(messageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.IMAGE,
        content: ['https://example.com/image-1.jpg'],
      }),
    );
    expect(whatsappService.sendImage).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsapp: expect.objectContaining({
          accessToken: 'tenant-access-token',
          phoneNumberId: 'phone-number-1',
        }),
      }),
      '5215551234567',
      'https://example.com/image-1.jpg',
    );
    expect(result).toBe(createdMessage);
  });

  it('parses stringified image URL arrays before sending them to WhatsApp', async () => {
    const conversation = {
      _id: 'conversation-id',
      tenantId: 'tenant-id',
      waId: '5215551234567',
    };
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

    conversationModel.findOne.mockResolvedValue(conversation);
    messageModel.create.mockResolvedValue(createdMessage);
    conversationModel.updateOne.mockResolvedValue({ acknowledged: true });
    whatsappService.sendImage.mockResolvedValue(undefined);

    const result = await service.sendMessage({
      conversationId: 'conversation-id',
      from: MessageFrom.AGENT,
      type: MessageType.IMAGE,
      content: JSON.stringify(imageUrls),
      internalNote: false,
    });

    expect(messageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.IMAGE,
        content: imageUrls,
      }),
    );
    expect(whatsappService.sendImage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        whatsapp: expect.objectContaining({
          accessToken: 'tenant-access-token',
          phoneNumberId: 'phone-number-1',
        }),
      }),
      '5215551234567',
      'https://example.com/image-1.jpg',
    );
    expect(whatsappService.sendImage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        whatsapp: expect.objectContaining({
          accessToken: 'tenant-access-token',
          phoneNumberId: 'phone-number-1',
        }),
      }),
      '5215551234567',
      'https://example.com/image-2.jpg',
    );
    expect(result).toBe(createdMessage);
  });

  it('clears unread count when finding messages by conversation', async () => {
    const conversation = { _id: 'conversation-id', waId: '5215551234567' };
    const messages = [
      {
        _id: 'message-id',
        conversationId: 'conversation-id',
        from: MessageFrom.USER,
        type: MessageType.TEXT,
        content: 'hola',
      },
    ];
    const sort = jest.fn().mockResolvedValue(messages);

    conversationModel.findOne.mockResolvedValue(conversation);
    messageModel.find.mockReturnValue({ sort });
    conversationModel.updateOne.mockResolvedValue({ acknowledged: true });

    const result = await service.findByConversation(
      'conversation-id',
      '67e8a7b7b9d2f3a1c4d5e6bb',
    );

    expect(conversationModel.updateOne).toHaveBeenCalledWith(
      {
        _id: 'conversation-id',
        tenantId: expect.any(Object),
      },
      {
        $set: {
          lastReadAt: expect.any(Date),
          unreadCount: 0,
        },
      },
    );
    expect(result).toBe(messages);
  });
});

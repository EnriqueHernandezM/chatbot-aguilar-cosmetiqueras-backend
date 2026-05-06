import { Test, TestingModule } from '@nestjs/testing';

import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';
import { ConversationState } from 'src/common/enums/conversation-state.enum';
import { ConversationStatus } from 'src/common/enums/conversation-status.enum';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationFlowService } from '../flow/conversation-flow.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WebhookService } from './webhook.service';
import { notifyWaitingHumanNewMessage } from 'src/common/utils/telegram-alerts/telegram-alerts.util';

jest.mock('src/common/utils/telegram-alerts/telegram-alerts.util', () => ({
  notifyWaitingHumanNewMessage: jest.fn(),
}));

describe('WebhookService', () => {
  let service: WebhookService;

  const whatsappService = {
    sendText: jest.fn(),
    sendImage: jest.fn(),
    getMediaMetadata: jest.fn(),
    downloadMedia: jest.fn(),
  };

  const conversationsService = {
    findOrCreateConversation: jest.fn(),
    acquireLock: jest.fn(),
    updateState: jest.fn(),
    releaseLock: jest.fn(),
  };

  const messagesService = {
    messageExists: jest.fn(),
    createMessage: jest.fn(),
  };

  const flowService = {
    processMessage: jest.fn(),
  };

  const notificationsService = {
    sendIncomingMessageNotification: jest.fn(),
  };

  const storageService = {
    uploadBuffer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: WhatsAppService,
          useValue: whatsappService,
        },
        {
          provide: ConversationsService,
          useValue: conversationsService,
        },
        {
          provide: MessagesService,
          useValue: messagesService,
        },
        {
          provide: ConversationFlowService,
          useValue: flowService,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: StorageService,
          useValue: storageService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    jest.clearAllMocks();
});

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sends additional replies as separate bot messages', async () => {
    messagesService.messageExists.mockResolvedValue(false);
    conversationsService.findOrCreateConversation.mockResolvedValue({
      _id: 'conversation-1',
      currentState: ConversationState.MENU,
    });
    conversationsService.acquireLock.mockResolvedValue({
      _id: 'conversation-1',
    });
    flowService.processMessage.mockResolvedValue({
      reply: 'Primer mensaje',
      additionalReplies: ['Segundo mensaje'],
      nextState: ConversationState.SHOW_MODELS,
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-1',
                    from: '5215551234567',
                    type: 'text',
                    text: {
                      body: '1',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.processWebhook(payload);

    expect(whatsappService.sendText).toHaveBeenNthCalledWith(
      1,
      '5215551234567',
      'Primer mensaje',
    );
    expect(whatsappService.sendText).toHaveBeenNthCalledWith(
      2,
      '5215551234567',
      'Segundo mensaje',
    );
    expect(messagesService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        from: MessageFrom.BOT,
        type: MessageType.TEXT,
        content: 'Segundo mensaje',
      }),
    );
    expect(notificationsService.sendIncomingMessageNotification).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      phone: '5215551234567',
      preview: '1',
      assignedUserId: undefined,
      handledBy: 'bot',
    });
    expect(conversationsService.releaseLock).toHaveBeenCalledWith(
      'conversation-1',
    );
  });

  it('sends the page intro and url as separate messages before the models image when PAGE_URL exists', async () => {
    const previousPageUrl = process.env.PAGE_URL;
    const previousModelsImage = process.env.MODELS_IMAGE_NATIONAL;

    process.env.PAGE_URL = 'https://example.com';
    process.env.MODELS_IMAGE_NATIONAL = 'https://example.com/models.jpg';

    messagesService.messageExists.mockResolvedValue(false);
    conversationsService.findOrCreateConversation.mockResolvedValue({
      _id: 'conversation-1',
      currentState: ConversationState.MENU,
    });
    conversationsService.acquireLock.mockResolvedValue({
      _id: 'conversation-1',
    });
    flowService.processMessage.mockResolvedValue({
      reply: 'Primer mensaje',
      additionalReplies: ['Segundo mensaje'],
      nextState: ConversationState.SHOW_MODELS,
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-2',
                    from: '5215551234567',
                    type: 'text',
                    text: {
                      body: '1',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.processWebhook(payload);

    expect(whatsappService.sendText).toHaveBeenNthCalledWith(
      1,
      '5215551234567',
      'Primer mensaje',
    );
    expect(whatsappService.sendText).toHaveBeenNthCalledWith(
      2,
      '5215551234567',
      'Aquí puedes ver todos los colores y modelos disponibles 👇',
    );
    expect(whatsappService.sendText).toHaveBeenNthCalledWith(
      3,
      '5215551234567',
      'https://example.com',
      true,
    );
    expect(whatsappService.sendImage).toHaveBeenCalledWith(
      '5215551234567',
      'https://example.com/models.jpg',
    );
    expect(messagesService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        from: MessageFrom.BOT,
        type: MessageType.TEXT,
        content: 'Aquí puedes ver todos los colores y modelos disponibles 👇',
      }),
    );
    expect(messagesService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        from: MessageFrom.BOT,
        type: MessageType.TEXT,
        content: 'https://example.com',
      }),
    );

    process.env.PAGE_URL = previousPageUrl;
    process.env.MODELS_IMAGE_NATIONAL = previousModelsImage;
  });

  it(
    'sends each configured models image when the env value is a string array',
    async () => {
    const previousModelsImage = process.env.MODELS_IMAGE_NATIONAL;

    process.env.MODELS_IMAGE_NATIONAL = JSON.stringify([
      'https://example.com/models-1.jpg',
      'https://example.com/models-2.jpg',
      'https://example.com/models-3.jpg',
    ]);

    messagesService.messageExists.mockResolvedValue(false);
    conversationsService.findOrCreateConversation.mockResolvedValue({
      _id: 'conversation-1',
      currentState: ConversationState.MENU,
    });
    conversationsService.acquireLock.mockResolvedValue({
      _id: 'conversation-1',
    });
    flowService.processMessage.mockResolvedValue({
      reply: 'Primer mensaje',
      nextState: ConversationState.SHOW_MODELS,
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-4',
                    from: '5215551234567',
                    type: 'text',
                    text: {
                      body: '1',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.processWebhook(payload);

    expect(whatsappService.sendImage).toHaveBeenNthCalledWith(
      1,
      '5215551234567',
      'https://example.com/models-1.jpg',
    );
    expect(whatsappService.sendImage).toHaveBeenNthCalledWith(
      2,
      '5215551234567',
      'https://example.com/models-2.jpg',
    );
    expect(whatsappService.sendImage).toHaveBeenNthCalledWith(
      3,
      '5215551234567',
      'https://example.com/models-3.jpg',
    );

    process.env.MODELS_IMAGE_NATIONAL = previousModelsImage;
    },
    10000,
  );

  it('alerts agents when a new message arrives in a waiting_human conversation', async () => {
    messagesService.messageExists.mockResolvedValue(false);
    conversationsService.findOrCreateConversation.mockResolvedValue({
      _id: 'conversation-9',
      currentState: ConversationState.WAITING_HUMAN,
      status: ConversationStatus.WAITING_HUMAN,
      assignedTo: 'user-9',
    });
    conversationsService.acquireLock.mockResolvedValue({
      _id: 'conversation-9',
    });
    flowService.processMessage.mockResolvedValue(null);

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-3',
                    from: '5215551234567',
                    type: 'text',
                    text: {
                      body: 'Necesito seguimiento',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.processWebhook(payload);

    expect(notifyWaitingHumanNewMessage).toHaveBeenCalledWith(
      '5215551234567',
      'conversation-9',
      'Necesito seguimiento',
    );
    expect(notificationsService.sendIncomingMessageNotification).toHaveBeenCalledWith({
      conversationId: 'conversation-9',
      phone: '5215551234567',
      preview: 'Necesito seguimiento',
      assignedUserId: 'user-9',
      handledBy: undefined,
    });
    expect(conversationsService.updateState).not.toHaveBeenCalled();
    expect(whatsappService.sendText).not.toHaveBeenCalled();
  });

  it('stores a single incoming client image without sending the text-only error reply', async () => {
    messagesService.messageExists.mockResolvedValue(false);
    whatsappService.getMediaMetadata.mockResolvedValue({
      id: 'meta-image-1',
      url: 'https://lookaside.fbsbx.com/whatsapp-business/media/image-1',
      mime_type: 'image/jpeg',
    });
    whatsappService.downloadMedia.mockResolvedValue({
      buffer: Buffer.from('image-binary'),
      contentType: 'image/jpeg',
    });
    storageService.uploadBuffer.mockResolvedValue({
      url: 'https://storage.example.com/whatsapp/image-1.jpg',
    });
    conversationsService.findOrCreateConversation.mockResolvedValue({
      _id: 'conversation-15',
      currentState: ConversationState.MENU,
      status: ConversationStatus.ACTIVE,
    });
    conversationsService.acquireLock.mockResolvedValue({
      _id: 'conversation-15',
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-image-1',
                    from: '5215551234567',
                    type: 'image',
                    image: {
                      id: 'meta-image-1',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.processWebhook(payload);

    expect(messagesService.createMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-15',
      from: MessageFrom.USER,
      type: MessageType.IMAGE,
      content: 'https://storage.example.com/whatsapp/image-1.jpg',
      waMessageId: 'wamid-image-1',
    });
    expect(flowService.processMessage).not.toHaveBeenCalled();
    expect(whatsappService.sendText).not.toHaveBeenCalled();
    expect(whatsappService.getMediaMetadata).toHaveBeenCalledWith(
      'meta-image-1',
    );
    expect(whatsappService.downloadMedia).toHaveBeenCalledWith(
      'https://lookaside.fbsbx.com/whatsapp-business/media/image-1',
    );
    expect(storageService.uploadBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        buffer: Buffer.from('image-binary'),
        contentType: 'image/jpeg',
      }),
    );
  });

  it('responds with an error when multiple client images arrive in the same webhook payload', async () => {
    messagesService.messageExists.mockResolvedValue(false);
    conversationsService.findOrCreateConversation.mockResolvedValue({
      _id: 'conversation-16',
      currentState: ConversationState.MENU,
      status: ConversationStatus.ACTIVE,
    });
    conversationsService.acquireLock.mockResolvedValue({
      _id: 'conversation-16',
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-image-2',
                    from: '5215551234567',
                    type: 'image',
                    image: {
                      id: 'meta-image-2',
                    },
                  },
                  {
                    id: 'wamid-image-3',
                    from: '5215551234567',
                    type: 'image',
                    image: {
                      id: 'meta-image-3',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.processWebhook(payload);

    expect(messagesService.createMessage).toHaveBeenCalledTimes(1);
    expect(messagesService.createMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-16',
      from: MessageFrom.BOT,
      type: MessageType.TEXT,
      content:
        'Por favor envia solo una imagen por mensaje para poder procesarla correctamente.',
    });
    expect(whatsappService.sendText).toHaveBeenCalledWith(
      '5215551234567',
      'Por favor envia solo una imagen por mensaje para poder procesarla correctamente.',
    );
    expect(flowService.processMessage).not.toHaveBeenCalled();
  });

  it('ignores unsupported incoming payloads without trying to persist an empty text message', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-location-1',
                    from: '5215551234567',
                    type: 'location',
                    location: {
                      latitude: 19.4326,
                      longitude: -99.1332,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.processWebhook(payload);

    expect(messagesService.messageExists).not.toHaveBeenCalled();
    expect(messagesService.createMessage).not.toHaveBeenCalled();
    expect(whatsappService.sendText).not.toHaveBeenCalled();
  });

  it('treats interactive button replies as text messages', async () => {
    messagesService.messageExists.mockResolvedValue(false);
    conversationsService.findOrCreateConversation.mockResolvedValue({
      _id: 'conversation-17',
      currentState: ConversationState.MENU,
      status: ConversationStatus.ACTIVE,
    });
    conversationsService.acquireLock.mockResolvedValue({
      _id: 'conversation-17',
    });
    flowService.processMessage.mockResolvedValue({
      reply: 'Respuesta del bot',
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-interactive-1',
                    from: '5215551234567',
                    type: 'interactive',
                    interactive: {
                      button_reply: {
                        id: 'option-1',
                        title: 'Ver modelos',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.processWebhook(payload);

    expect(messagesService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-17',
        from: MessageFrom.USER,
        type: MessageType.TEXT,
        content: 'Ver modelos',
        waMessageId: 'wamid-interactive-1',
      }),
    );
    expect(flowService.processMessage).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'conversation-17' }),
      'Ver modelos',
      '5215551234567',
    );
  });
});

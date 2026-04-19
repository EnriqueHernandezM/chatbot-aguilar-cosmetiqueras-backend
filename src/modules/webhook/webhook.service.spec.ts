import { Test, TestingModule } from '@nestjs/testing';

import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';
import { ConversationState } from 'src/common/enums/conversation-state.enum';
import { ConversationStatus } from 'src/common/enums/conversation-status.enum';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationFlowService } from '../flow/conversation-flow.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
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

  it('sends the page url text before the models image when PAGE_URL exists', async () => {
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
      'Puedes visitar nuestra pagina:\nhttps://example.com',
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
        content: 'Puedes visitar nuestra pagina:\nhttps://example.com',
      }),
    );

    process.env.PAGE_URL = previousPageUrl;
    process.env.MODELS_IMAGE_NATIONAL = previousModelsImage;
  });

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
});

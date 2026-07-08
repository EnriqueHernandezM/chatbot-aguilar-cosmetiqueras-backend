import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  const conversationsService = {
    takeConversation: jest.fn(),
    getUpdates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: conversationsService,
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('takes a conversation with the authenticated user', async () => {
    const request = {
      user: {
        sub: 'user-123',
        role: 'admin',
        tenantId: '67e8a7b7b9d2f3a1c4d5e6bb',
        tokenVersion: 1,
      },
    } as any;

    conversationsService.takeConversation.mockResolvedValue({
      _id: 'conversation-1',
    });

    await controller.takeConversation('conversation-1', request);

    expect(conversationsService.takeConversation).toHaveBeenCalledWith(
      'conversation-1',
      'user-123',
      '67e8a7b7b9d2f3a1c4d5e6bb',
    );
  });

  it('gets conversation updates from a timestamp', async () => {
    conversationsService.getUpdates.mockResolvedValue([]);

    const request = {
      user: {
        tenantId: '67e8a7b7b9d2f3a1c4d5e6bb',
      },
    } as any;

    await controller.getUpdates({ since: '2026-03-30T10:00:00' }, request);

    expect(conversationsService.getUpdates).toHaveBeenCalledWith(
      '2026-03-30T10:00:00',
      '67e8a7b7b9d2f3a1c4d5e6bb',
    );
  });
});

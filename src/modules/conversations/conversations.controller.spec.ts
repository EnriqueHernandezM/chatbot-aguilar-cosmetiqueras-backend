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
    );
  });

  it('gets conversation updates from a timestamp', async () => {
    conversationsService.getUpdates.mockResolvedValue([]);

    await controller.getUpdates({ since: '2026-03-30T10:00:00' });

    expect(conversationsService.getUpdates).toHaveBeenCalledWith(
      '2026-03-30T10:00:00',
    );
  });
});

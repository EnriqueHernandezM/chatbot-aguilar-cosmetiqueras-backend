import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { Conversation } from './schemas/conversation.schema';
import { User } from '../users/schemas/user.schema';
import { ConversationStatus } from 'src/common/enums/conversation-status.enum';
import { ConversationState } from 'src/common/enums/conversation-state.enum';
import { Message } from '../messages/schemas/message.schema';
import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';

describe('ConversationsService', () => {
  let service: ConversationsService;
  const conversationPopulate = jest.fn();
  const conversationSort = jest.fn();
  const conversationModel = {
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  };
  const userSelect = jest.fn();
  const userModel = {
    findById: jest.fn(),
    collection: {
      name: 'users',
    },
  };
  const messageModel = {
    collection: {
      name: 'messages',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: conversationModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: messageModel,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    jest.clearAllMocks();
    userModel.findById.mockReturnValue({
      select: userSelect,
    });
    conversationModel.findByIdAndUpdate.mockReturnValue({
      populate: conversationPopulate,
    });
    conversationModel.find.mockReturnValue({
      populate: conversationPopulate,
    });
    conversationPopulate.mockReturnValue({
      sort: conversationSort,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('takes a conversation and assigns it to the current user', async () => {
    userSelect.mockResolvedValue({ _id: 'user-123' });
    conversationPopulate.mockResolvedValue({ _id: 'conversation-1' });

    await service.takeConversation('conversation-1', 'user-123');

    expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'conversation-1',
      {
        $set: {
          assignedTo: 'user-123',
          status: ConversationStatus.WAITING_HUMAN,
          currentState: ConversationState.HUMAN_HANDOFF,
          lastReadAt: expect.any(Date),
        },
      },
      { new: true },
    );
    expect(conversationPopulate).toHaveBeenCalledWith(
      'assignedTo',
      'name email role active',
    );
  });

  it('throws when the user does not exist', async () => {
    userSelect.mockResolvedValue(null);

    await expect(
      service.takeConversation('conversation-1', 'user-123'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns conversations with the latest non-internal message preview', async () => {
    conversationModel.aggregate.mockResolvedValue([
      {
        _id: 'conversation-2',
        waId: '5215551234567',
        status: ConversationStatus.ACTIVE,
        assignedTo: {
          _id: 'user-1',
          name: 'Agente',
          email: 'agente@test.com',
          role: 'admin',
          active: true,
        },
        lastMessageData: [
          {
            _id: 'message-1',
            from: MessageFrom.USER,
            type: MessageType.TEXT,
            content: 'Hola, quiero cotizar',
            createdAt: new Date('2026-03-30T10:01:00.000Z'),
          },
        ],
      },
    ]);

    const result = await service.findAll({});

    expect(conversationModel.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          $match: {},
        },
        expect.objectContaining({
          $sort: {
            lastMessageAt: -1,
            updatedAt: -1,
          },
        }),
      ]),
    );
    expect(result[0].lastMessage).toEqual({
      id: 'message-1',
      from: MessageFrom.USER,
      type: MessageType.TEXT,
      content: 'Hola, quiero cotizar',
      createdAt: new Date('2026-03-30T10:01:00.000Z'),
    });
    expect(result[0]).not.toHaveProperty('lastMessageData');
    expect(conversationModel.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({
            let: expect.objectContaining({
              conversationIdString: { $toString: '$_id' },
            }),
          }),
        }),
      ]),
    );
  });

  it('filters internal notes from the last message preview', async () => {
    conversationModel.aggregate.mockResolvedValue([
      {
        _id: 'conversation-3',
        lastMessageData: [],
      },
    ]);

    const result = await service.findAll({});

    expect(result[0].lastMessage).toBeNull();
  });

  it('keeps the last message preview when internalNote is missing', async () => {
    conversationModel.aggregate.mockResolvedValue([
      {
        _id: 'conversation-4',
        lastMessageData: [
          {
            _id: 'message-2',
            from: MessageFrom.BOT,
            type: MessageType.TEXT,
            content: 'Te comparto la informacion',
            createdAt: new Date('2026-03-30T10:05:00.000Z'),
          },
        ],
      },
    ]);

    const result = await service.findAll({});

    expect(result[0].lastMessage).toEqual({
      id: 'message-2',
      from: MessageFrom.BOT,
      type: MessageType.TEXT,
      content: 'Te comparto la informacion',
      createdAt: new Date('2026-03-30T10:05:00.000Z'),
    });
  });

  it('returns incremental conversation updates for polling', async () => {
    const updates = [
      {
        id: 'conv_1',
        lastMessage: 'Hola',
        updatedAt: new Date('2026-03-30T10:01:00.000Z'),
      },
    ];
    conversationModel.aggregate.mockResolvedValue(updates);

    const result = await service.getUpdates('2026-03-30T10:00:00.000Z');

    expect(conversationModel.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          $match: {
            updatedAt: { $gt: new Date('2026-03-30T10:00:00.000Z') },
          },
        },
      ]),
    );
    expect(result).toEqual(updates);
  });
});

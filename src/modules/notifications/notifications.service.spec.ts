import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { FcmToken } from './schemas/fcm-token.schema';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const findSelect = jest.fn();
  const findLean = jest.fn();

  const fcmTokenModel = {
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn(),
    deleteMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(FcmToken.name),
          useValue: fcmTokenModel,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
    fcmTokenModel.find.mockReturnValue({
      select: findSelect,
    });
    findSelect.mockReturnValue({
      lean: findLean,
    });
  });

  it('upserts a token for the user', async () => {
    fcmTokenModel.findOneAndUpdate.mockResolvedValue({
      _id: 'token-id',
      token: 'fcm-token-123456',
      platform: 'web',
      deviceName: 'Chrome Android',
      userAgent: 'UA',
      updatedAt: new Date('2026-04-08T00:00:00.000Z'),
    });

    const result = await service.saveFcmToken('67e8a7b7b9d2f3a1c4d5e6aa', {
      token: 'fcm-token-123456',
      platform: 'web',
      deviceName: 'Chrome Android',
      userAgent: 'UA',
    });

    expect(fcmTokenModel.findOneAndUpdate).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'token-id',
      token: 'fcm-token-123456',
      platform: 'web',
      deviceName: 'Chrome Android',
      userAgent: 'UA',
      updatedAt: new Date('2026-04-08T00:00:00.000Z'),
    });
  });

  it('deletes a token for the user', async () => {
    fcmTokenModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const result = await service.deleteFcmToken(
      '67e8a7b7b9d2f3a1c4d5e6aa',
      'fcm-token-123456',
    );

    expect(result).toEqual({ deleted: true });
  });

  it('sends incoming notifications to all users when the conversation is not assigned', async () => {
    findLean.mockResolvedValue([{ token: 'token-1' }, { token: 'token-2' }]);
    const sendToTokensSpy = jest
      .spyOn(service as any, 'sendToTokens')
      .mockResolvedValue(undefined);

    await service.sendIncomingMessageNotification({
      conversationId: 'conversation-1',
      phone: '5215551234567',
      preview: 'Hola',
      handledBy: 'bot',
    });

    expect(fcmTokenModel.find).toHaveBeenCalledWith({});
    expect(sendToTokensSpy).toHaveBeenCalledWith(
      ['token-1', 'token-2'],
      expect.objectContaining({
        data: {
          conversationId: 'conversation-1',
          phone: '5215551234567',
          preview: 'Hola',
          handledBy: 'bot',
        },
      }),
    );
  });

  it('sends incoming notifications only to the assigned user tokens', async () => {
    findLean.mockResolvedValue([{ token: 'token-9' }]);
    const sendToTokensSpy = jest
      .spyOn(service as any, 'sendToTokens')
      .mockResolvedValue(undefined);

    await service.sendIncomingMessageNotification({
      conversationId: 'conversation-9',
      phone: '5215551234567',
      preview: 'Necesito seguimiento',
      assignedUserId: '67e8a7b7b9d2f3a1c4d5e6aa',
    });

    expect(fcmTokenModel.find).toHaveBeenCalledWith({
      userId: expect.any(Types.ObjectId),
    });
    expect(sendToTokensSpy).toHaveBeenCalledWith(
      ['token-9'],
      expect.objectContaining({
        data: {
          conversationId: 'conversation-9',
          phone: '5215551234567',
          preview: 'Necesito seguimiento',
        },
      }),
    );
  });
});

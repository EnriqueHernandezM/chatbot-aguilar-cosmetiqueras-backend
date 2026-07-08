import { Test, TestingModule } from '@nestjs/testing';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const notificationsService = {
    saveFcmToken: jest.fn(),
    deleteFcmToken: jest.fn(),
    sendTestNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  it('stores an fcm token for the logged-in user', async () => {
    await controller.saveFcmToken(
      {
        user: {
          sub: 'user-1',
          tenantId: '67e8a7b7b9d2f3a1c4d5e6bb',
        },
      } as any,
      {
        token: 'fcm-token-123456',
        platform: 'web',
        deviceName: 'Chrome Android',
        userAgent: 'UA',
      },
    );

    expect(notificationsService.saveFcmToken).toHaveBeenCalledWith(
      'user-1',
      '67e8a7b7b9d2f3a1c4d5e6bb',
      {
        token: 'fcm-token-123456',
        platform: 'web',
        deviceName: 'Chrome Android',
        userAgent: 'UA',
      },
    );
  });
});

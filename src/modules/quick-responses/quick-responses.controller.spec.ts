import { Test, TestingModule } from '@nestjs/testing';

import { QuickResponsesController } from './quick-responses.controller';
import { QuickResponsesService } from './quick-responses.service';

describe('QuickResponsesController', () => {
  let controller: QuickResponsesController;

  const quickResponsesService = {
    create: jest.fn(),
    findAvailable: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickResponsesController],
      providers: [
        {
          provide: QuickResponsesService,
          useValue: quickResponsesService,
        },
      ],
    }).compile();

    controller = module.get<QuickResponsesController>(QuickResponsesController);
    jest.clearAllMocks();
  });

  it('creates a quick response', async () => {
    const request = {
      user: {
        tenantId: '67e8a7b7b9d2f3a1c4d5e6bb',
      },
    } as any;

    await controller.create(
      {
        category: 'ATENCION',
        title: 'Saludo inicial',
        content: 'Hola, con gusto te atiendo.',
        status: true,
        order: 1,
      },
      request,
    );

    expect(quickResponsesService.create).toHaveBeenCalledWith(
      {
        category: 'ATENCION',
        title: 'Saludo inicial',
        content: 'Hola, con gusto te atiendo.',
        status: true,
        order: 1,
      },
      '67e8a7b7b9d2f3a1c4d5e6bb',
    );
  });

  it('lists available quick responses', async () => {
    const request = {
      user: {
        tenantId: '67e8a7b7b9d2f3a1c4d5e6bb',
      },
    } as any;

    await controller.findAvailable(request);

    expect(quickResponsesService.findAvailable).toHaveBeenCalledWith(
      '67e8a7b7b9d2f3a1c4d5e6bb',
    );
  });
});

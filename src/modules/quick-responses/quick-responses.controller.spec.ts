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
    await controller.create({
      category: 'ATENCION',
      title: 'Saludo inicial',
      content: 'Hola, con gusto te atiendo.',
      status: true,
      order: 1,
    });

    expect(quickResponsesService.create).toHaveBeenCalledWith({
      category: 'ATENCION',
      title: 'Saludo inicial',
      content: 'Hola, con gusto te atiendo.',
      status: true,
      order: 1,
    });
  });

  it('lists available quick responses', async () => {
    await controller.findAvailable();

    expect(quickResponsesService.findAvailable).toHaveBeenCalled();
  });
});

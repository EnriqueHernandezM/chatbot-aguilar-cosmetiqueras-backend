import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { QuickResponse } from './schemas/quick-response.schema';
import { QuickResponsesService } from './quick-responses.service';

describe('QuickResponsesService', () => {
  let service: QuickResponsesService;
  const sort = jest.fn();

  const quickResponseModel = {
    create: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickResponsesService,
        {
          provide: getModelToken(QuickResponse.name),
          useValue: quickResponseModel,
        },
      ],
    }).compile();

    service = module.get<QuickResponsesService>(QuickResponsesService);
    jest.clearAllMocks();
    quickResponseModel.find.mockReturnValue({
      sort,
    });
  });

  it('creates a quick response with default values', async () => {
    quickResponseModel.create.mockResolvedValue({ _id: 'qr-1' });

    await service.create({
      category: 'ATENCION',
      title: 'Saludo inicial',
      content: 'Hola, con gusto te atiendo.',
    });

    expect(quickResponseModel.create).toHaveBeenCalledWith({
      category: 'ATENCION',
      title: 'Saludo inicial',
      content: 'Hola, con gusto te atiendo.',
      status: true,
      order: 0,
    });
  });

  it('lists only active quick responses', async () => {
    sort.mockResolvedValue([{ _id: 'qr-1' }]);

    await service.findAvailable();

    expect(quickResponseModel.find).toHaveBeenCalledWith({ status: true });
    expect(sort).toHaveBeenCalledWith({
      category: 1,
      order: 1,
      createdAt: 1,
      _id: 1,
    });
  });
});

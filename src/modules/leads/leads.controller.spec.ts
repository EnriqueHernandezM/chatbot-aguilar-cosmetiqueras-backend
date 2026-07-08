import { Test, TestingModule } from '@nestjs/testing';

import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

describe('LeadsController', () => {
  let controller: LeadsController;
  const leadsService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    updateLead: jest.fn(),
  };

  const request = {
    user: {
      tenantId: '67e8a7b7b9d2f3a1c4d5e6bb',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        {
          provide: LeadsService,
          useValue: leadsService,
        },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists leads for the authenticated tenant', async () => {
    await controller.findAll(request);

    expect(leadsService.findAll).toHaveBeenCalledWith(
      '67e8a7b7b9d2f3a1c4d5e6bb',
    );
  });

  it('updates leads for the authenticated tenant', async () => {
    await controller.updateLead(
      'lead-1',
      {
        product: 'Modelo B',
      },
      request,
    );

    expect(leadsService.updateLead).toHaveBeenCalledWith(
      'lead-1',
      {
        product: 'Modelo B',
      },
      '67e8a7b7b9d2f3a1c4d5e6bb',
    );
  });
});

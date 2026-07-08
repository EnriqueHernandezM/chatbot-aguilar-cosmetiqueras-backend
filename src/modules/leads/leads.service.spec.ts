import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Conversation } from '../conversations/schemas/conversation.schema';
import { Lead } from './schemas/lead.schema';
import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  let service: LeadsService;
  const leadSort = jest.fn();
  const leadModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const conversationSelect = jest.fn();
  const conversationModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: getModelToken(Lead.name),
          useValue: leadModel,
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: conversationModel,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    jest.clearAllMocks();
    leadModel.find.mockReturnValue({ sort: leadSort });
    conversationModel.findById.mockReturnValue({ select: conversationSelect });
  });

  it('creates leads with tenantId from the conversation', async () => {
    const tenantId = new Types.ObjectId('67e8a7b7b9d2f3a1c4d5e6bb');
    conversationSelect.mockResolvedValue({ tenantId });
    leadModel.create.mockResolvedValue({ _id: 'lead-1' });

    await service.createLead({
      conversationId: '67e8a7b7b9d2f3a1c4d5e6cc',
      name: 'Cliente',
      quantity: 10,
      product: 'Modelo A',
      location: 'CDMX',
    });

    expect(leadModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        conversationId: '67e8a7b7b9d2f3a1c4d5e6cc',
      }),
    );
  });

  it('lists leads by tenant', async () => {
    leadSort.mockResolvedValue([]);

    await service.findAll('67e8a7b7b9d2f3a1c4d5e6bb');

    expect(leadModel.find).toHaveBeenCalledWith({
      tenantId: expect.any(Types.ObjectId),
    });
  });

  it('updates leads by id and tenant', async () => {
    leadModel.findOneAndUpdate.mockResolvedValue({ _id: 'lead-1' });

    await service.updateLead(
      '67e8a7b7b9d2f3a1c4d5e6aa',
      { product: 'Modelo B' },
      '67e8a7b7b9d2f3a1c4d5e6bb',
    );

    expect(leadModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: '67e8a7b7b9d2f3a1c4d5e6aa',
        tenantId: expect.any(Types.ObjectId),
      },
      { $set: { product: 'Modelo B' } },
      { new: true },
    );
  });

  it('throws when the lead does not belong to the tenant', async () => {
    leadModel.findOne.mockResolvedValue(null);

    await expect(
      service.findById('67e8a7b7b9d2f3a1c4d5e6aa', '67e8a7b7b9d2f3a1c4d5e6bb'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { Tenant } from './schemas/tenant.schema';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  let service: TenantsService;
  const tenantModel = {
    create: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getModelToken(Tenant.name),
          useValue: tenantModel,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    jest.clearAllMocks();
  });

  it('creates a tenant with normalized uid and slug values', async () => {
    tenantModel.findOne.mockResolvedValue(null);
    tenantModel.create.mockResolvedValue({ _id: 'tenant-1' });

    await service.create({
      uid: ' tenant_uid ',
      name: ' Distribuidora Aguilar ',
      slug: ' Aguilar ',
      whatsapp: {
        phoneNumberId: ' phone-number-1 ',
      },
    });

    expect(tenantModel.findOne).toHaveBeenCalledWith({
      $or: [{ uid: 'tenant_uid' }, { slug: 'aguilar' }],
    });
    expect(tenantModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'tenant_uid',
        name: 'Distribuidora Aguilar',
        slug: 'aguilar',
        active: true,
        plan: 'free',
        whatsapp: {
          phoneNumberId: 'phone-number-1',
        },
      }),
    );
  });

  it('throws when creating a duplicated tenant', async () => {
    tenantModel.findOne.mockResolvedValue({ _id: 'tenant-1' });

    await expect(
      service.create({
        uid: 'tenant_uid',
        name: 'Distribuidora Aguilar',
        slug: 'aguilar',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates only provided nested tenant fields', async () => {
    tenantModel.findOne.mockResolvedValue(null);
    tenantModel.findByIdAndUpdate.mockResolvedValue({ _id: 'tenant-1' });

    await service.update('tenant-1', {
      slug: ' Aguilar ',
      whatsapp: {
        phoneNumberId: ' phone-number-2 ',
      },
      settings: {
        botEnabled: false,
      },
    });

    expect(tenantModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'tenant-1',
      {
        $set: {
          slug: 'aguilar',
          'whatsapp.phoneNumberId': 'phone-number-2',
          'settings.botEnabled': false,
        },
      },
      { new: true },
    );
  });

  it('throws when updating to an existing uid or slug', async () => {
    tenantModel.findOne.mockResolvedValue({ _id: 'tenant-2' });

    await expect(
      service.update('tenant-1', {
        slug: 'aguilar',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when deleting a tenant that does not exist', async () => {
    tenantModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

    await expect(service.remove('tenant-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

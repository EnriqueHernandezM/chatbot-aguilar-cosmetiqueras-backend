import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './schemas/tenant.schema';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name)
    private tenantModel: Model<Tenant>,
  ) {}

  async create(payload: CreateTenantDto) {
    const uid = payload.uid.trim();
    const slug = payload.slug.trim().toLowerCase();

    const exists = await this.tenantModel.findOne({
      $or: [{ uid }, { slug }],
    });

    if (exists) {
      throw new ConflictException('Tenant already exists');
    }

    return this.tenantModel.create({
      uid,
      name: payload.name.trim(),
      slug,
      active: payload.active ?? true,
      plan: payload.plan ?? 'free',
      whatsapp: this.trimObjectValues(payload.whatsapp),
      branding: this.trimObjectValues(payload.branding),
      settings: payload.settings,
    });
  }

  async findAll() {
    return this.tenantModel.find().sort({
      name: 1,
      createdAt: -1,
      _id: 1,
    });
  }

  async findById(id: string) {
    const tenant = await this.tenantModel.findById(id);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, payload: UpdateTenantDto) {
    const update = this.buildUpdate(payload);

    if (update.uid || update.slug) {
      const duplicatedTenant = await this.tenantModel.findOne({
        _id: { $ne: id },
        $or: [
          ...(update.uid ? [{ uid: update.uid }] : []),
          ...(update.slug ? [{ slug: update.slug }] : []),
        ],
      });

      if (duplicatedTenant) {
        throw new ConflictException('Tenant already exists');
      }
    }

    const tenant = await this.tenantModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async remove(id: string) {
    const result = await this.tenantModel.deleteOne({ _id: id });

    if ((result.deletedCount ?? 0) === 0) {
      throw new NotFoundException('Tenant not found');
    }

    return { deleted: true };
  }

  private buildUpdate(payload: UpdateTenantDto) {
    const update: Record<string, any> = {};

    if (payload.uid !== undefined) {
      update.uid = payload.uid.trim();
    }

    if (payload.name !== undefined) {
      update.name = payload.name.trim();
    }

    if (payload.slug !== undefined) {
      update.slug = payload.slug.trim().toLowerCase();
    }

    if (payload.active !== undefined) {
      update.active = payload.active;
    }

    if (payload.plan !== undefined) {
      update.plan = payload.plan;
    }

    this.assignNestedUpdate(update, 'whatsapp', payload.whatsapp);
    this.assignNestedUpdate(update, 'branding', payload.branding);
    this.assignNestedUpdate(update, 'settings', payload.settings);

    return update;
  }

  private assignNestedUpdate(
    update: Record<string, any>,
    prefix: string,
    value?: Record<string, any>,
  ) {
    if (!value) {
      return;
    }

    Object.entries(value).forEach(([key, fieldValue]) => {
      if (fieldValue === undefined) {
        return;
      }

      update[`${prefix}.${key}`] =
        typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
    });
  }

  private trimObjectValues(value?: Record<string, any>) {
    if (!value) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, fieldValue]) => [
        key,
        typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue,
      ]),
    );
  }
}

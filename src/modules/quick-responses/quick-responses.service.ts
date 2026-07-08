import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateQuickResponseDto } from './dto/create-quick-response.dto';
import { QuickResponse } from './schemas/quick-response.schema';

@Injectable()
export class QuickResponsesService {
  constructor(
    @InjectModel(QuickResponse.name)
    private quickResponseModel: Model<QuickResponse>,
  ) {}

  async create(payload: CreateQuickResponseDto, tenantId: string) {
    return this.quickResponseModel.create({
      tenantId: new Types.ObjectId(tenantId),
      category: payload.category.trim(),
      title: payload.title.trim(),
      content: payload.content.trim(),
      status: payload.status ?? true,
      order: payload.order ?? 0,
    });
  }

  async findAvailable(tenantId: string) {
    return this.quickResponseModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: true,
      })
      .sort({
        category: 1,
        order: 1,
        createdAt: 1,
        _id: 1,
      });
  }
}

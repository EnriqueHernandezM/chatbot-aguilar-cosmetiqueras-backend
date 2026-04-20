import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateQuickResponseDto } from './dto/create-quick-response.dto';
import { QuickResponse } from './schemas/quick-response.schema';

@Injectable()
export class QuickResponsesService {
  constructor(
    @InjectModel(QuickResponse.name)
    private quickResponseModel: Model<QuickResponse>,
  ) {}

  async create(payload: CreateQuickResponseDto) {
    return this.quickResponseModel.create({
      category: payload.category.trim(),
      title: payload.title.trim(),
      content: payload.content.trim(),
      status: payload.status ?? true,
      order: payload.order ?? 0,
    });
  }

  async findAvailable() {
    return this.quickResponseModel.find({ status: true }).sort({
      category: 1,
      order: 1,
      createdAt: 1,
      _id: 1,
    });
  }
}

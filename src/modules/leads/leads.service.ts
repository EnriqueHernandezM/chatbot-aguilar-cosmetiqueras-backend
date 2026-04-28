import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead } from './schemas/lead.schema';
import { CreateLeadPayload } from './interfaces/create-lead-payload.interface';
import { UpdateLeadDto } from './dto/update-lead.dto';
@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name)
    private leadModel: Model<Lead>,
  ) {}

  async createLead(data: CreateLeadPayload) {
    return this.leadModel.create({
      conversationId: data.conversationId,
      name: data.name,
      quantity: data.quantity,
      product: data.product,
      location: data.location ?? null,
    });
  }

  async findAll() {
    return this.leadModel.find().sort({ updatedAt: -1, createdAt: -1 });
  }

  async findById(id: string) {
    const lead = await this.leadModel.findById(id);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async updateLead(id: string, payload: UpdateLeadDto) {
    const lead = await this.leadModel.findByIdAndUpdate(
      id,
      {
        $set: payload,
      },
      { new: true },
    );

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }
}

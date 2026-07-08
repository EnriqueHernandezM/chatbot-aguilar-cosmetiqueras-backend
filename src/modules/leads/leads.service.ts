import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { Lead } from './schemas/lead.schema';
import { CreateLeadPayload } from './interfaces/create-lead-payload.interface';
import { UpdateLeadDto } from './dto/update-lead.dto';
@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name)
    private leadModel: Model<Lead>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
  ) {}

  async createLead(data: CreateLeadPayload) {
    const conversation = await this.conversationModel
      .findById(data.conversationId)
      .select('tenantId');

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.leadModel.create({
      tenantId: conversation.tenantId,
      conversationId: data.conversationId,
      name: data.name,
      quantity: data.quantity,
      product: data.product,
      location: data.location ?? null,
    });
  }

  async findAll(tenantId: string) {
    return this.leadModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ updatedAt: -1, createdAt: -1 });
  }

  async findById(id: string, tenantId: string) {
    const lead = await this.leadModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async updateLead(id: string, payload: UpdateLeadDto, tenantId: string) {
    const lead = await this.leadModel.findOneAndUpdate(
      { _id: id, tenantId: new Types.ObjectId(tenantId) },
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

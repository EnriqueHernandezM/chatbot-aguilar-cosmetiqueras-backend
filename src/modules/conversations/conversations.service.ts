/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Conversation } from './schemas/conversation.schema';
import { ConversationState } from 'src/common/enums/conversation-state.enum';
import { ConversationStatus } from 'src/common/enums/conversation-status.enum';
import { detectRegion } from 'src/common/utils/region.util';
import { User } from '../users/schemas/user.schema';
import { FindConversationsFilters } from './interfaces/find-conversations-filters.interface';
import { UpdateConversationSaleDto } from './dto/update-conversation-sale.dto';
import { Message } from '../messages/schemas/message.schema';
import { ConversationLastMessage } from './interfaces/conversation-last-message.interface';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
  ) {}

  async acquireLock(conversationId: string) {
    const now = new Date();

    const lockTime = new Date(now.getTime() + 5000);

    const conversation = await this.conversationModel.findOneAndUpdate(
      {
        _id: conversationId,
        $or: [{ lockUntil: null }, { lockUntil: { $lt: now } }],
      },
      {
        $set: { lockUntil: lockTime },
      },
      { new: true },
    );

    return conversation;
  }
  async releaseLock(conversationId: string) {
    await this.conversationModel.updateOne(
      { _id: conversationId },
      { $set: { lockUntil: null } },
    );
  }

  async touchLastMessage(
    conversationId: string | Types.ObjectId,
    timestamp: Date,
  ) {
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          lastMessageAt: timestamp,
        },
      },
      { new: true },
    );
  }

  async markAsRead(
    conversationId: string | Types.ObjectId,
    timestamp = new Date(),
    tenantId?: string | Types.ObjectId,
  ) {
    return this.conversationModel.findOneAndUpdate(
      this.withTenant({ _id: conversationId }, tenantId),
      {
        $set: {
          lastReadAt: timestamp,
          unreadCount: 0,
        },
      },
      { new: true },
    );
  }

  async findOrCreateConversation(waId: string, tenantId?: Types.ObjectId) {
    const now = new Date();

    return this.conversationModel.findOneAndUpdate(
      this.withTenant({ waId }, tenantId),
      {
        $setOnInsert: {
          tenantId,
          waId,
          currentState: ConversationState.MENU,
          status: ConversationStatus.ACTIVE,
          origin: detectRegion(waId),
          lastMessageAt: now,
          lastReadAt: null,
          unreadCount: 0,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );
  }

  async updateState(
    conversationId: string | Types.ObjectId,
    nextState: ConversationState,
  ) {
    const nextStatus =
      nextState === ConversationState.HUMAN_HANDOFF ||
      nextState === ConversationState.WAITING_HUMAN
        ? ConversationStatus.WAITING_HUMAN
        : ConversationStatus.ACTIVE;

    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          currentState: nextState,
          status: nextStatus,
          lastMessageAt: new Date(),
        },
      },
      { new: true },
    );
  }

  async findAll(filters: FindConversationsFilters, tenantId: string) {
    const query: Record<string, string | Types.ObjectId> = {};
    const tenantObjectId = new Types.ObjectId(tenantId);

    query.tenantId = tenantObjectId;

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.assignedTo) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }

    const conversations = await this.conversationModel.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: 'assignedTo',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                name: 1,
                email: 1,
                role: 1,
                active: 1,
              },
            },
          ],
          as: 'assignedTo',
        },
      },
      {
        $unwind: {
          path: '$assignedTo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: this.messageModel.collection.name,
          let: {
            conversationId: '$_id',
            conversationIdString: { $toString: '$_id' },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$conversationId', '$$conversationId'] },
                    { $eq: ['$conversationId', '$$conversationIdString'] },
                  ],
                },
                tenantId: tenantObjectId,
                internalNote: { $ne: true },
              },
            },
            {
              $sort: {
                createdAt: -1,
                _id: -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                _id: 1,
                from: 1,
                type: 1,
                content: 1,
                createdAt: 1,
              },
            },
          ],
          as: 'lastMessageData',
        },
      },
      {
        $sort: {
          lastMessageAt: -1,
          updatedAt: -1,
        },
      },
    ]);

    return conversations.map((conversation) => {
      const { lastMessageData, ...conversationData } = conversation;

      return {
        ...conversationData,
        lastMessage: this.mapLastMessage(lastMessageData?.[0]),
      };
    });
  }

  async getUpdates(since: string, tenantId: string) {
    const sinceDate = new Date(since);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const updates = await this.conversationModel.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          updatedAt: { $gt: sinceDate },
        },
      },
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: this.messageModel.collection.name,
          let: {
            conversationId: '$_id',
            conversationIdString: { $toString: '$_id' },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$conversationId', '$$conversationId'] },
                    { $eq: ['$conversationId', '$$conversationIdString'] },
                  ],
                },
                tenantId: tenantObjectId,
                internalNote: { $ne: true },
              },
            },
            {
              $sort: {
                createdAt: -1,
                _id: -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                _id: 0,
                content: 1,
              },
            },
          ],
          as: 'lastMessageData',
        },
      },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          updatedAt: 1,
          lastMessage: {
            $let: {
              vars: {
                content: {
                  $arrayElemAt: ['$lastMessageData.content', 0],
                },
              },
              in: {
                $cond: [
                  { $isArray: '$$content' },
                  {
                    $reduce: {
                      input: '$$content',
                      initialValue: '',
                      in: {
                        $concat: [
                          '$$value',
                          {
                            $cond: [{ $eq: ['$$value', ''] }, '', ', '],
                          },
                          '$$this',
                        ],
                      },
                    },
                  },
                  '$$content',
                ],
              },
            },
          },
        },
      },
    ]);

    return updates;
  }

  private mapLastMessage(
    message?: Partial<ConversationLastMessage> & { _id?: Types.ObjectId },
  ): ConversationLastMessage | null {
    if (!message) {
      return null;
    }

    return {
      id: String(message._id),
      from: message.from!,
      type: message.type!,
      content: message.content!,
      createdAt: message.createdAt!,
    };
  }

  async assignConversation(
    conversationId: string,
    userId: string,
    tenantId: string,
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const user = await this.userModel
      .findOne({ _id: userId, tenantId: tenantObjectId })
      .select('_id');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { _id: conversationId, tenantId: tenantObjectId },
        {
          $set: {
            assignedTo: user._id,
          },
        },
        { new: true },
      )
      .populate('assignedTo', 'name email role active');

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async takeConversation(
    conversationId: string,
    userId: string,
    tenantId: string,
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const user = await this.userModel
      .findOne({ _id: userId, tenantId: tenantObjectId })
      .select('_id');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { _id: conversationId, tenantId: tenantObjectId },
        {
          $set: {
            assignedTo: user._id,
            status: ConversationStatus.WAITING_HUMAN,
            currentState: ConversationState.HUMAN_HANDOFF,
            lastReadAt: new Date(),
            unreadCount: 0,
          },
        },
        { new: true },
      )
      .populate('assignedTo', 'name email role active');

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async updateStatus(
    conversationId: string,
    status: ConversationStatus,
    tenantId: string,
  ) {
    const currentState =
      status === ConversationStatus.WAITING_HUMAN
        ? ConversationState.WAITING_HUMAN
        : ConversationState.MENU;

    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { _id: conversationId, tenantId: new Types.ObjectId(tenantId) },
        {
          $set: {
            status,
            currentState,
          },
        },
        { new: true },
      )
      .populate('assignedTo', 'name email role active');

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async updateNickname(
    conversationId: string,
    nickname: string | null,
    tenantId: string,
  ) {
    const normalizedNickname =
      nickname === null ? null : nickname?.trim() ?? null;

    const conversation = await this.conversationModel.findOneAndUpdate(
      { _id: conversationId, tenantId: new Types.ObjectId(tenantId) },
      {
        $set: {
          nickname: normalizedNickname,
        },
      },
      { new: true },
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async deleteMany(ids: string[], tenantId: string) {
    const result = await this.conversationModel.deleteMany({
      _id: { $in: ids },
      tenantId: new Types.ObjectId(tenantId),
    });

    return {
      deletedCount: result.deletedCount ?? 0,
    };
  }

  async updateSaleFlags(
    conversationId: string,
    payload: UpdateConversationSaleDto,
    tenantId: string,
  ) {
    const update: Record<string, boolean> = {};

    if (payload.isPotentialSale !== undefined) {
      update.isPotentialSale = payload.isPotentialSale;
    }

    if (payload.isClosedSale !== undefined) {
      update.isClosedSale = payload.isClosedSale;
    }

    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { _id: conversationId, tenantId: new Types.ObjectId(tenantId) },
        {
          $set: update,
        },
        { new: true },
      )
      .populate('assignedTo', 'name email role active');

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async markAsPotentialSale(conversationId: string | Types.ObjectId) {
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          isPotentialSale: true,
        },
      },
      { new: true },
    );
  }

  private withTenant(
    query: Record<string, unknown>,
    tenantId?: string | Types.ObjectId,
  ) {
    if (!tenantId) {
      return query;
    }

    return {
      ...query,
      tenantId:
        typeof tenantId === 'string' ? new Types.ObjectId(tenantId) : tenantId,
    };
  }
}

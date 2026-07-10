import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthenticatedRequest } from 'src/common/auth/interfaces/authenticated-request.interface';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { DeleteConversationsDto } from './dto/delete-conversations.dto';
import { FindConversationsDto } from './dto/find-conversations.dto';
import { GetConversationUpdatesDto } from './dto/get-conversation-updates.dto';
import { UpdateConversationNicknameDto } from './dto/update-conversation-nickname.dto';
import { UpdateConversationSaleDto } from './dto/update-conversation-sale.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { ConversationsService } from './conversations.service';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async findAll(
    @Query() query: FindConversationsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.findAll(query, req.user.tenantId);
  }

  @Get('updates')
  async getUpdates(
    @Query() query: GetConversationUpdatesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.getUpdates(query.since, req.user.tenantId);
  }

  @Patch(':id/assign')
  async assignConversation(
    @Param('id') id: string,
    @Body() payload: AssignConversationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.assignConversation(
      id,
      payload.userId,
      req.user.tenantId,
    );
  }

  @Patch(':id/take')
  async takeConversation(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.takeConversation(
      id,
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateConversationStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.updateStatus(
      id,
      payload.status,
      req.user.tenantId,
    );
  }

  @Patch(':id/nickname')
  async updateNickname(
    @Param('id') id: string,
    @Body() payload: UpdateConversationNicknameDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.updateNickname(
      id,
      payload.nickname,
      req.user.tenantId,
    );
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.conversationsService.markAsRead(
      id,
      undefined,
      req.user.tenantId,
    );
  }

  @Patch(':id/sale')
  async updateSaleFlags(
    @Param('id') id: string,
    @Body() payload: UpdateConversationSaleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.updateSaleFlags(
      id,
      payload,
      req.user.tenantId,
    );
  }

  @Delete()
  async deleteMany(
    @Body() payload: DeleteConversationsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.deleteMany(payload.ids, req.user.tenantId);
  }
}

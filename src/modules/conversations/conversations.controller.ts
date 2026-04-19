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
import { UpdateConversationSaleDto } from './dto/update-conversation-sale.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { ConversationsService } from './conversations.service';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async findAll(@Query() query: FindConversationsDto) {
    return this.conversationsService.findAll(query);
  }

  @Get('updates')
  async getUpdates(@Query() query: GetConversationUpdatesDto) {
    return this.conversationsService.getUpdates(query.since);
  }

  @Patch(':id/assign')
  async assignConversation(
    @Param('id') id: string,
    @Body() payload: AssignConversationDto,
  ) {
    return this.conversationsService.assignConversation(id, payload.userId);
  }

  @Patch(':id/take')
  async takeConversation(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.takeConversation(id, req.user.sub);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateConversationStatusDto,
  ) {
    return this.conversationsService.updateStatus(id, payload.status);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.conversationsService.markAsRead(id);
  }

  @Patch(':id/sale')
  async updateSaleFlags(
    @Param('id') id: string,
    @Body() payload: UpdateConversationSaleDto,
  ) {
    return this.conversationsService.updateSaleFlags(id, payload);
  }

  @Delete()
  async deleteMany(@Body() payload: DeleteConversationsDto) {
    return this.conversationsService.deleteMany(payload.ids);
  }
}

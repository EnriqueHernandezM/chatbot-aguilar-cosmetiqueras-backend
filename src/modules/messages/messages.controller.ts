import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthenticatedRequest } from 'src/common/auth/interfaces/authenticated-request.interface';
import { FindMessagesDto } from './dto/find-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async findByConversation(
    @Query() query: FindMessagesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.messagesService.findByConversation(
      query.conversationId,
      req.user.tenantId,
    );
  }

  @Post('send')
  async send(
    @Body() payload: SendMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.messagesService.sendMessage(
      payload,
      req.user.tenantId,
      req.user.userId,
    );
  }
}

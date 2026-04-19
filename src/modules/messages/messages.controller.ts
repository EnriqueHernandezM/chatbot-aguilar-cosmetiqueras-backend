import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { FindMessagesDto } from './dto/find-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async findByConversation(@Query() query: FindMessagesDto) {
    return this.messagesService.findByConversation(query.conversationId);
  }

  @Post('send')
  async send(@Body() payload: SendMessageDto) {
    return this.messagesService.sendMessage(payload);
  }
}

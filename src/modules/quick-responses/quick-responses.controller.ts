import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateQuickResponseDto } from './dto/create-quick-response.dto';
import { QuickResponsesService } from './quick-responses.service';

@ApiTags('quick-responses')
@Controller('quick-responses')
export class QuickResponsesController {
  constructor(
    private readonly quickResponsesService: QuickResponsesService,
  ) {}

  @Post()
  async create(@Body() payload: CreateQuickResponseDto) {
    return this.quickResponsesService.create(payload);
  }

  @Get()
  async findAvailable() {
    return this.quickResponsesService.findAvailable();
  }
}

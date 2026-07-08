import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthenticatedRequest } from 'src/common/auth/interfaces/authenticated-request.interface';
import { CreateQuickResponseDto } from './dto/create-quick-response.dto';
import { QuickResponsesService } from './quick-responses.service';

@ApiTags('quick-responses')
@Controller('quick-responses')
export class QuickResponsesController {
  constructor(private readonly quickResponsesService: QuickResponsesService) {}

  @Post()
  async create(
    @Body() payload: CreateQuickResponseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.quickResponsesService.create(payload, req.user.tenantId);
  }

  @Get()
  async findAvailable(@Req() req: AuthenticatedRequest) {
    return this.quickResponsesService.findAvailable(req.user.tenantId);
  }
}

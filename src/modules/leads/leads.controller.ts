import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthenticatedRequest } from 'src/common/auth/interfaces/authenticated-request.interface';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.leadsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.leadsService.findById(id, req.user.tenantId);
  }

  @Patch(':id')
  async updateLead(
    @Param('id') id: string,
    @Body() payload: UpdateLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadsService.updateLead(id, payload, req.user.tenantId);
  }
}

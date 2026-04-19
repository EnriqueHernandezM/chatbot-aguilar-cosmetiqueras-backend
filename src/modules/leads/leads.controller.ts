import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async findAll() {
    return this.leadsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @Patch(':id')
  async updateLead(@Param('id') id: string, @Body() payload: UpdateLeadDto) {
    return this.leadsService.updateLead(id, payload);
  }
}

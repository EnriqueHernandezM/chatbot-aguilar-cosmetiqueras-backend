import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpCode,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/common/auth/public.decorator';
import { WebhookService } from './webhook.service';

@ApiTags('webhook')
@Public()
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  verifyWebhook(
    @Query('hub_mode') mode: string,
    @Query('hub_challenge') challenge: string,
    @Query('hub_verify_token') token: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  }

  @Post()
  @HttpCode(200)
  async receiveMessage(@Body() payload: any) {
    await this.webhookService.processWebhook(payload);
    return { status: 'received' };
  }
}

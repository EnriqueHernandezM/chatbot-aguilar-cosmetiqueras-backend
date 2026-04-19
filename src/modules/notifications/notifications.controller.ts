import { Body, Controller, Delete, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthenticatedRequest } from 'src/common/auth/interfaces/authenticated-request.interface';
import { DeleteFcmTokenDto } from './dto/delete-fcm-token.dto';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { TestNotificationDto } from './dto/test-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('fcm-token')
  async saveFcmToken(
    @Req() req: AuthenticatedRequest,
    @Body() payload: SaveFcmTokenDto,
  ) {
    return this.notificationsService.saveFcmToken(req.user.sub, payload);
  }

  @Delete('fcm-token')
  async deleteFcmToken(
    @Req() req: AuthenticatedRequest,
    @Body() payload: DeleteFcmTokenDto,
  ) {
    return this.notificationsService.deleteFcmToken(
      req.user.sub,
      payload.token,
    );
  }

  @Post('test')
  async sendTest(
    @Req() req: AuthenticatedRequest,
    @Body() payload: TestNotificationDto,
  ) {
    return this.notificationsService.sendTestNotification(
      req.user.sub,
      payload.token,
    );
  }
}

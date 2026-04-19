import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { getDatabaseConfig } from './config/database.config';

import { UsersModule } from './modules/users/users.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { LeadsModule } from './modules/leads/leads.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { FlowModule } from './modules/flow/flow.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard';
import { HealthController } from './health.controller';

//import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      useFactory: getDatabaseConfig,
    }),

    UsersModule,
    ConversationsModule,
    MessagesModule,
    LeadsModule,
    WebhookModule,
    FlowModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}

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
import { QuickResponsesModule } from './modules/quick-responses/quick-responses.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/auth/guards/roles.guard';
import { HealthController } from './health.controller';

//import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'development' ? '.env.development' : undefined,
      isGlobal: true,
    }),

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
    QuickResponsesModule,
    TenantsModule,
    GalleryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}

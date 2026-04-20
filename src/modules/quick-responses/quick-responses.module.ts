import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  QuickResponse,
  QuickResponseSchema,
} from './schemas/quick-response.schema';
import { QuickResponsesController } from './quick-responses.controller';
import { QuickResponsesService } from './quick-responses.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QuickResponse.name, schema: QuickResponseSchema },
    ]),
  ],
  controllers: [QuickResponsesController],
  providers: [QuickResponsesService],
  exports: [QuickResponsesService],
})
export class QuickResponsesModule {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  buildCorsOptions,
  httpLoggingMiddleware,
  invalidRouteHandler,
  rateLimitMiddleware,
} from './common/security/security.utils';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const config = new DocumentBuilder()
    .setTitle('Chat bot distribuidora vickmar')
    .setDescription('This chat mage a clients of distributor.')
    .setVersion('0.5.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors(buildCorsOptions());
  app.use(httpLoggingMiddleware);
  app.use(rateLimitMiddleware);
  await app.init();

  app.use(invalidRouteHandler);

  const port = Number(process.env.PORT) || 8082;
  await app.listen(port, '0.0.0.0');

  const localUrl = await app.getUrl();
  logger.log(`Servidor corriendo en el puerto: ${port}`);
  logger.log(`URL local: ${localUrl}`);
  logger.log(`Swagger: ${localUrl}/api`);
}
bootstrap();

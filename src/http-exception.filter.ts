import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errRes = exception.message;
    const nameErr = exception.name;
    const resOneError: object = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      msge: nameErr,
      err: errRes,
    };
    response.status(status).json({
      resOneError,
    });
  }
}

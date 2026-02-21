import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    let message: string;

    if (
      typeof exceptionResponse === 'object' &&
      Array.isArray(exceptionResponse.message)
    ) {
      // Validation errors from class-validator — join all messages into one readable string
      message = exceptionResponse.message.join('. ');
    } else if (
      typeof exceptionResponse === 'object' &&
      typeof exceptionResponse.message === 'string'
    ) {
      message = exceptionResponse.message;
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else {
      message = 'An unexpected error occurred';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
    });
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Har qanday chiqarilgan xatolikni (ApiException orqali chiqarilmagan
 * bo'lsa ham) bo'lim 4.4 dagi bir xil { success:false, error:{...} }
 * formatiga keltiradi.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'object' && body !== null && 'success' in body) {
      response.status(status).json(body);
      return;
    }

    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? (body as { message: string | string[] }).message
        : exception.message;

    response.status(status).json({
      success: false,
      error: {
        code: HttpStatus[status] || 'ERROR',
        message: Array.isArray(message) ? message.join(', ') : message,
      },
    });
  }
}

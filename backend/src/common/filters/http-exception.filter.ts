import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Har qanday chiqarilgan xatolikni (ApiException orqali chiqarilmagan
 * bo'lsa ham, hatto HttpException bo'lmagan kutilmagan xatoliklarni ham —
 * masalan TypeORM QueryFailedError) bo'lim 4.4 dagi bir xil
 * { success:false, error:{...} } formatiga keltiradi. HttpException
 * bo'lmagan xatoliklar to'liq stack trace bilan log qilinadi, chunki
 * ular kutilmagan (bug) hisoblanadi.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Kutilmagan xatolik',
        exception instanceof Error ? exception.stack : undefined,
      );
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Serverda ichki xatolik yuz berdi.',
        },
      });
      return;
    }

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

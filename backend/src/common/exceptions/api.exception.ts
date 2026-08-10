import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Bo'lim 4.4 dagi standart xatolik formatini ({code, message, details})
 * barcha guard/servislarda bir xilda hosil qilish uchun.
 */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super({ success: false, error: { code, message, details } }, status);
  }
}

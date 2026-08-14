import { HttpException, HttpStatus } from '@nestjs/common';
export declare class ApiException extends HttpException {
    constructor(status: HttpStatus, code: string, message: string, details?: Record<string, unknown>);
}

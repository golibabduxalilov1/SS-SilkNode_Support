"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(HttpExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if (!(exception instanceof common_1.HttpException)) {
            this.logger.error(exception instanceof Error ? exception.message : 'Kutilmagan xatolik', exception instanceof Error ? exception.stack : undefined);
            response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
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
        const message = typeof body === 'object' && body !== null && 'message' in body
            ? body.message
            : exception.message;
        response.status(status).json({
            success: false,
            error: {
                code: common_1.HttpStatus[status] || 'ERROR',
                message: Array.isArray(message) ? message.join(', ') : message,
            },
        });
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map
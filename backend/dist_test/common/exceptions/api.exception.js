"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiException = void 0;
const common_1 = require("@nestjs/common");
class ApiException extends common_1.HttpException {
    constructor(status, code, message, details) {
        super({ success: false, error: { code, message, details } }, status);
    }
}
exports.ApiException = ApiException;
//# sourceMappingURL=api.exception.js.map
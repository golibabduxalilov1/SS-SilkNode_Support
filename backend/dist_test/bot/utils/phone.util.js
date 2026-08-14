"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToE164 = normalizeToE164;
const libphonenumber_js_1 = require("libphonenumber-js");
function normalizeToE164(rawPhoneNumber) {
    const withPlus = rawPhoneNumber.startsWith('+') ? rawPhoneNumber : `+${rawPhoneNumber}`;
    const parsed = (0, libphonenumber_js_1.parsePhoneNumberFromString)(withPlus);
    return parsed ? parsed.number : withPlus;
}
//# sourceMappingURL=phone.util.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envValidationSchema = exports.configuration = void 0;
var configuration_1 = require("./configuration");
Object.defineProperty(exports, "configuration", { enumerable: true, get: function () { return configuration_1.default; } });
var env_validation_1 = require("./env.validation");
Object.defineProperty(exports, "envValidationSchema", { enumerable: true, get: function () { return env_validation_1.envValidationSchema; } });
__exportStar(require("./providers.config"), exports);
//# sourceMappingURL=index.js.map
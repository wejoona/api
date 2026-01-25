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
exports.CommandHandlers = void 0;
const resolve_deadletter_command_1 = require("./resolve-deadletter.command");
const ignore_deadletter_command_1 = require("./ignore-deadletter.command");
const retry_deadletter_command_1 = require("./retry-deadletter.command");
__exportStar(require("./resolve-deadletter.command"), exports);
__exportStar(require("./ignore-deadletter.command"), exports);
__exportStar(require("./retry-deadletter.command"), exports);
exports.CommandHandlers = [
    resolve_deadletter_command_1.ResolveDeadletterCommandHandler,
    ignore_deadletter_command_1.IgnoreDeadletterCommandHandler,
    retry_deadletter_command_1.RetryDeadletterCommandHandler,
];
//# sourceMappingURL=index.js.map
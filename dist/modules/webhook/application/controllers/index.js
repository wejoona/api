"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controllers = exports.WebhookAdminController = exports.WebhookController = void 0;
const webhook_controller_1 = require("./webhook.controller");
Object.defineProperty(exports, "WebhookController", { enumerable: true, get: function () { return webhook_controller_1.WebhookController; } });
const webhook_admin_controller_1 = require("./webhook-admin.controller");
Object.defineProperty(exports, "WebhookAdminController", { enumerable: true, get: function () { return webhook_admin_controller_1.WebhookAdminController; } });
exports.Controllers = [webhook_controller_1.WebhookController, webhook_admin_controller_1.WebhookAdminController];
//# sourceMappingURL=index.js.map
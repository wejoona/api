"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UseCases = exports.GetDepositStatusUseCase = exports.GetTransactionUseCase = exports.GetTransactionsUseCase = void 0;
const get_transactions_use_case_1 = require("./get-transactions.use-case");
Object.defineProperty(exports, "GetTransactionsUseCase", { enumerable: true, get: function () { return get_transactions_use_case_1.GetTransactionsUseCase; } });
const get_transaction_use_case_1 = require("./get-transaction.use-case");
Object.defineProperty(exports, "GetTransactionUseCase", { enumerable: true, get: function () { return get_transaction_use_case_1.GetTransactionUseCase; } });
const get_deposit_status_use_case_1 = require("./get-deposit-status.use-case");
Object.defineProperty(exports, "GetDepositStatusUseCase", { enumerable: true, get: function () { return get_deposit_status_use_case_1.GetDepositStatusUseCase; } });
exports.UseCases = [
    get_transactions_use_case_1.GetTransactionsUseCase,
    get_transaction_use_case_1.GetTransactionUseCase,
    get_deposit_status_use_case_1.GetDepositStatusUseCase,
];
//# sourceMappingURL=index.js.map
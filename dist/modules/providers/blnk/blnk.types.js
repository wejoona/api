"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOONAPAY_MONITORS = exports.JOONAPAY_INTERNAL_BALANCES = exports.JOONAPAY_LEDGERS = void 0;
exports.JOONAPAY_LEDGERS = {
    GENERAL: 'joonapay-general-ledger',
    CUSTOMER_WALLETS: 'joonapay-customer-wallets',
};
exports.JOONAPAY_INTERNAL_BALANCES = {
    PAY_IN_YELLOWCARD: '@PayInYellowCard',
    PAY_IN_CIRCLE: '@PayInCircle',
    PAY_OUT_YELLOWCARD: '@PayOutYellowCard',
    PAY_OUT_CIRCLE: '@PayOutCircle',
    FEES: '@Fees',
    REVENUE: '@Revenue',
    FLOAT: '@Float',
};
exports.JOONAPAY_MONITORS = {
    HIGH_DEBIT_ALERT: {
        field: 'debit_balance',
        operator: '>',
        value: 10000_000000,
        precision: 1000000,
        description: 'High debit volume alert - possible fraud',
    },
    LOW_BALANCE_WARNING: {
        field: 'balance',
        operator: '<',
        value: 10_000000,
        precision: 1000000,
        description: 'Low balance warning',
    },
    LOW_FLOAT_ALERT: {
        field: 'balance',
        operator: '<',
        value: 50000_000000,
        precision: 1000000,
        description: 'Low float alert - replenishment needed',
    },
    AML_DAILY_LIMIT: {
        field: 'debit_balance',
        operator: '>=',
        value: 3000_000000,
        precision: 1000000,
        description: 'AML daily transaction limit reached',
    },
};
//# sourceMappingURL=blnk.types.js.map
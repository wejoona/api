"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSourceOptions = void 0;
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
dotenv.config();
exports.dataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'usdc_wallet',
    entities: [
        __dirname +
            '/../modules/**/infrastructure/orm-entities/*.orm-entity{.ts,.js}',
    ],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
};
const dataSource = new typeorm_1.DataSource(exports.dataSourceOptions);
exports.default = dataSource;
//# sourceMappingURL=data-source.js.map
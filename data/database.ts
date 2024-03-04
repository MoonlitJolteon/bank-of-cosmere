import { Sequelize } from 'sequelize-typescript';
import { Dialect } from 'sequelize';
import { BankAccount } from '../models/accounts';
import { NetworkComputer } from '../models/networkComputers';

export const sequelize = new Sequelize(process.env.DB_DATABASE || '', process.env.DB_USERNAME || '', process.env.DB_PASSWORD || '', {
    dialect: (process.env.DB_DIALECT || 'mysql') as Dialect,
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    logging: false
});

sequelize.addModels([
    BankAccount,
    NetworkComputer
]);
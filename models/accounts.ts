import { Table, Column, Model, PrimaryKey, AllowNull, DataType } from 'sequelize-typescript';

@Table({tableName: 'bank_accounts'})
export class BankAccount extends Model<BankAccount> {
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.STRING)
    public user_id!: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    public username!: string;
    
    @AllowNull(false)
    @Column(DataType.STRING)
    public user_uuid!: string;

    @AllowNull(false)
    @Column(DataType.INTEGER)
    public balance!: number;
}
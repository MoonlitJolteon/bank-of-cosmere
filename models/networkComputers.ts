import { Table, Column, Model, PrimaryKey, AllowNull, DataType } from 'sequelize-typescript';

@Table({tableName: 'bank_computers'})
export class NetworkComputer extends Model<NetworkComputer> {
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.STRING)
    public computer_id!: string;

    @AllowNull(false)
    @Column(DataType.INTEGER)
    public type!: number;

    @AllowNull(false)
    @Column(DataType.INTEGER)
    public flag!: number;

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    public just_rebooted!: boolean;
    
    @AllowNull(false)
    @Column(DataType.STRING)
    public checksum!: string;

    public static UNKNOWN = -1;

    public static AUTHORIZED = 1;
    public static TAMPERED = 2;

    public static ATM = 1;
    public static SERVER = 2;
    public static POWER = 3;

    public static DEFAULT_CHECKSUM = "unknown";
}
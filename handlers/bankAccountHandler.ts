import uuid4 from "uuid4";
import { logger } from "../logging";
import { BankAccount } from "../models/accounts";
import { Packet } from "../servers/ccWebsocket";
import { sequelize } from "../data/database";

export class BankAccountHandler {
    static async handleCheckIsAccount(packet: Packet, client: any) {
        let account = JSON.parse(packet.message);
        let accountExists = false;
        await BankAccount.findOne(
            {
                where: {
                    username: account.username,
                    user_uuid: account.uuid
                }
            }
        ).then((account: BankAccount | null) => {
            if (account == null) return;
            accountExists = true
        });
        client.send(JSON.stringify({
            packetType: accountExists ? "accountExists" : "accountDoesntExist",
            message: accountExists ? account.username : "false"
        }));
    }

    static async handleAccountCreation(packet: Packet) {
        let accountFromPacket = JSON.parse(packet.message);
        await BankAccount.findOne(
            {
                where: {
                    username: accountFromPacket.username,
                    user_uuid: accountFromPacket.uuid
                }
            }
        ).then(async (account: BankAccount | null) => {
            if (account instanceof BankAccount) return;
            await sequelize.transaction(async (transaction) => {
                let newAccount = BankAccount.build({
                    user_id: uuid4(),
                    username: accountFromPacket.username,
                    user_uuid: accountFromPacket.uuid,
                    balance: 0
                } as BankAccount);
                await newAccount.save({transaction});
            });
        });
    }

    public static async handleBalance(packet: any, wsClient: any) {
        let acc = JSON.parse(packet.message);
        BankAccount.findOne(
            {
                where: {
                    username: acc.username,
                    user_uuid: acc.uuid
                }
            }
        ).then((account: BankAccount | null) => {
            if (account == null) return;
            wsClient.send(JSON.stringify({
                packetType: "balance",
                message: account.balance
            }));
        })
    }
}
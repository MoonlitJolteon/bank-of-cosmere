import * as fs from 'fs';
import * as path from 'path';
import { NetworkComputer } from "../models/networkComputers";
import { sequelize } from '../data/database';

export class ConnectionHandler {
    public static async verifyChecksum(clients: Map<string, any>, client: any, packet: any) {
        let computerData = packet.message.computerData;
        let checksum = packet.message.checksum;
        let computerRow: NetworkComputer | undefined;
        await NetworkComputer.findOne({
            where: {
                computer_id: computerData.computerID
            }
        }).then(async (computer: NetworkComputer | null) => {
            if (computer == null) return;
            if (computer.checksum == NetworkComputer.DEFAULT_CHECKSUM) {
                await sequelize.transaction(async transaction => {
                    computer.checksum = checksum;
                    await computer.save({ transaction })
                });
                return;
            }
            if (computer.checksum != checksum) {
                await sequelize.transaction(async transaction => {
                    computer.flag = NetworkComputer.TAMPERED;
                    await computer.save({ transaction })
                });
                return;
            }
            computerRow = computer
        });
    
        let script = ConnectionHandler.getClientSpecificCode(computerData.computerName, ConnectionHandler.getClientType(computerData.computerType));
        let computerStatus = await ConnectionHandler.checkComputerStatus(clients, computerData.computerName);
    
        if (computerStatus.unauthorized) script = script = fs.readFileSync(path.join('./ccCode/errors/unauthorized.lua')).toString();
        if (computerStatus.tampered) script = fs.readFileSync(path.join('./ccCode/errors/tampered.lua')).toString();
        if (computerStatus.needsReboot) script = await ConnectionHandler.getRebootScript(computerData.computerID);
    
        client.send(JSON.stringify({
            packetType: "init",
            message: script
        }))
        
        if (computerRow != undefined && computerRow.just_rebooted) {
            await sequelize.transaction(async transaction => {
                computerRow!.just_rebooted = false;
                await computerRow!.save({ transaction })
            });
        }
    }

    public static getClientType(typeString: String): number {
        switch (typeString) {
            case "ATM":
                return NetworkComputer.ATM
            case "SERVER":
                return NetworkComputer.SERVER
            case "POWER":
                return NetworkComputer.POWER
            default:
                return NetworkComputer.UNKNOWN
        }
    }
    
    private static getClientSpecificCode(computerName: string, clientType: number): string {
        let script = `print("Successfully connected, Welcome ${computerName}!")\n`
        switch (clientType) {
            case NetworkComputer.ATM:
                script += fs.readFileSync(path.join('./ccCode/clients/atmClient.lua')).toString();
                break;
            case NetworkComputer.POWER:
                script += fs.readFileSync(path.join('./ccCode/clients/powerMonitorClient.lua')).toString();
                break;
            default:
                script = fs.readFileSync(path.join('./ccCode/clients/genericClient.lua')).toString();
        }
        return script;
    }

    private static async getRebootScript(computerID: string) {
        let script = fs.readFileSync(path.join('./ccCode/utils/rebootScript.lua')).toString();
        await NetworkComputer.findOne({
            where: {
                computer_id: computerID
            }
        }).then(async (computer: NetworkComputer | null) => {
            if (computer == null) return;
            if (computer.just_rebooted) return;
            await sequelize.transaction(async transaction => {
                computer.just_rebooted = true;
                await computer.save({ transaction })
            });
        })
        return script;
    }

    private static async checkComputerStatus(clients: Map<string, any>, clientName: string): Promise<any> {
        let client = clients.get(clientName);
        let computerID = client.computerInfo.computerID;
        let computerName = client.computerInfo.computerName;
        let authorized = false;
        let tampered = false;
        let needsReboot = true;
        await NetworkComputer.findOne({
            where: {
                computer_id: computerID
            }
        }).then((computer: NetworkComputer | null) => {
            if (computer == null) return;
            authorized = computer.flag == NetworkComputer.AUTHORIZED;
            tampered = computer.flag == NetworkComputer.TAMPERED;
            needsReboot = !computer.just_rebooted;
        });
        return {
            unauthorized: !authorized,
            tampered,
            needsReboot
        };
    }
}
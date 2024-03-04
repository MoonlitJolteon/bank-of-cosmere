import * as socket from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logging';
import { BankAccount } from '../models/accounts';
import { NetworkComputer } from '../models/networkComputers';
import { sequelize } from '../data/database';

interface DM {
    target: string,
    message: string
}
interface Packet {
    packetType: string,
    message: string
}

let clients: Map<string, any> = new Map();
const port = parseInt(process.env.websocketPort || '5656');
const websocket = new socket.WebSocketServer({ port })

export function getClients() {
    let keys = clients.keys();
    return keys;
}

export async function runWebsocket() {
    websocket.on("connection", wsClient => {
        logger.info("Incoming connection!");

        wsClient.on('message', messageData => {
            if (messageData.toString() == "setup") {
                logger.info("Installing new client...")
                wsClient.send(getSetupScript())
                return;
            }

            const packet: Packet = JSON.parse(messageData.toString())
            switch (packet.packetType) {
                case "onConnect":
                    handleConnection(packet, wsClient);
                    break;
                case "onDisconnect":
                    handleDiconnection(packet);
                    break;
                case "broadcast":
                    broadcast(messageData.toString());
                    break;
                case "dm":
                    handleDM(packet);
                    break;
                case "getBalance":
                    handleBalance(wsClient, packet);
                    break;
                case "checksum":
                    verifyChecksum(wsClient, packet);
                    break;
                default:
                    logger.info(`Unknown Packet: ${JSON.stringify(packet, null, 2)}`)
            }
        });

        wsClient.on("close", () => {
            logger.info("A connection ended!");
        });
    });
}

async function verifyChecksum(client: any, packet: any) {
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

    let script = getClientSpecificCode(computerData.computerName, getClientType(computerData.computerType));
    let computerStatus = await checkComputerStatus(computerData.computerName);

    if (computerStatus.unauthorized) script = script = fs.readFileSync(path.join('./ccCode/errors/unauthorized.lua')).toString();
    if (computerStatus.tampered) script = fs.readFileSync(path.join('./ccCode/errors/tampered.lua')).toString();
    if (computerStatus.needsReboot) script = await getRebootScript(computerData.computerID);

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

async function handleConnection(packet: any, client: any) {
    let message = JSON.parse(packet.message);
    client.computerInfo = message;
    clients.set(message.computerName, client);
    let type = getClientType(message.computerType);
    let packetOut = {
        packetType: "init",
        message: fs.readFileSync(path.join('./ccCode/utils/clientIntegrityCheck.lua')).toString()
    };
    await client.send(JSON.stringify(packetOut))
    NetworkComputer.findOne({
        where: {
            computer_id: message.computerID
        }
    }).then(async (computer: NetworkComputer | null) => {
        if (computer == null) {
            await sequelize.transaction(async transaction => {
                let computer = await NetworkComputer.build({
                    computer_id: message.computerID,
                    type: type,
                    flag: NetworkComputer.UNKNOWN,
                    just_rebooted: false,
                    checksum: NetworkComputer.DEFAULT_CHECKSUM,

                } as NetworkComputer);
                await computer.save({ transaction })
            });
            return;
        }
        let tampered = false;
        if (computer.type != type) tampered = true;
        if (tampered) {
            await sequelize.transaction(async transaction => {
                computer.flag = NetworkComputer.TAMPERED;
                await computer.save({ transaction })
            });
        }
    });
    logger.info(`Added ${message.computerName} to the client map`);
}

function getSetupScript(): string {
    return fs.readFileSync(path.join('./ccCode/utils/installer.lua')).toString()
}

function getClientType(typeString: String): number {
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

function getClientSpecificCode(computerName: string, clientType: number): string {
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

async function getRebootScript(computerID: string) {
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

function handleDiconnection(packet: any) {
    clients.delete(packet.message);
    logger.info(`Removed ${packet.message} to the client map`);
}

function broadcast(message: string) {
    websocket.clients.forEach(client => {
        client.send(message)
    });
}

async function handleBalance(wsClient: any, packet: any) {
    BankAccount.findOne(
        {
            where: {
                username: packet.message.username,
                user_uuid: packet.message.uuid
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

async function checkComputerStatus(clientName: string): Promise<any> {
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

export function runOnAll(code: string) {
    let packet: Packet = {
        packetType: "run",
        message: code
    }
    console.log(code)
    websocket.clients.forEach(client => {
        client.send(JSON.stringify(packet))
    })
}

export function runOnTarget(target: string, code: string) {
    let packet: Packet = {
        packetType: "run",
        message: code
    }
    console.log(target, code)
    clients.get(target).send(JSON.stringify(packet));
}

function handleDM(packet: Packet) {
    let dm: DM = JSON.parse(packet.message)
    let dmOut: Packet = {
        packetType: "getDM",
        message: dm.message
    }
    clients.get(dm.target).send(JSON.stringify(dmOut))
}

logger.info(`Websocket listening on port ${port}`)
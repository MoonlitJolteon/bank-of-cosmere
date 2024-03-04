import * as socket from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logging';
import { NetworkComputer } from '../models/networkComputers';
import { sequelize } from '../data/database';
import { BankAccountHandler } from '../handlers/bankAccountHandler';
import { ConnectionHandler } from '../handlers/connectionHandler';

interface DM {
    target: string,
    message: string
}
export interface Packet {
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
        // logger.info("Incoming connection!");
        wsClient.on('message', messageData => {
            if (messageData.toString() == "setup") {
                logger.info("Installing new client...")
                wsClient.send(getSetupScript())
                return;
            }

            const packet: Packet = JSON.parse(messageData.toString())
            switch (packet.packetType) {
                // Generic Packets
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
                case "checksum":
                    ConnectionHandler.verifyChecksum(clients, wsClient, packet);
                    break;

                // Bank Accounts
                case "getBalance":
                    BankAccountHandler.handleBalance(packet, wsClient);
                    break;
                case "createAccount":
                    BankAccountHandler.handleAccountCreation(packet)
                    break;
                case "checkIsAccount":
                    BankAccountHandler.handleCheckIsAccount(packet, wsClient)
                    break;
                default:
                    logger.info(`Unknown Packet: ${JSON.stringify(packet, null, 2)}`)
            }
        });

        wsClient.on("close", () => {
            // logger.info("A connection ended!");
        });
    });
}

async function handleConnection(packet: any, client: any) {
    let message = JSON.parse(packet.message);
    client.computerInfo = message;
    clients.set(message.computerName, client);
    let type = ConnectionHandler.getClientType(message.computerType);
    let justRebooted = false;
    let packetOut = {
        packetType: "init",
        message: fs.readFileSync(path.join('./ccCode/utils/clientIntegrityCheck.lua')).toString()
    };
    await client.send(JSON.stringify(packetOut))
    await NetworkComputer.findOne({
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
        justRebooted = computer.just_rebooted;
    });
    if(justRebooted) logger.info(`Added ${message.computerName} to the client map`);
}

function getSetupScript(): string {
    return fs.readFileSync(path.join('./ccCode/utils/installer.lua')).toString()
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
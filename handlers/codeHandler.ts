import { Request, Response } from "express";
import { getClients, runOnAll, runOnTarget } from "../servers/ccWebsocket";

export class CodeHandler {
    public static postAll(req: Request, res: Response) {
        runOnAll(req.body.code);
        res.render('run', {
            all: true,
            one: false,
            clients: getClients()
        })
    }

    public static postOne(req: Request, res: Response) {
        runOnTarget(req.body.target, req.body.code);
        res.render('run', {
            all: false,
            one: true,
            clients: getClients()
        })
    }
}
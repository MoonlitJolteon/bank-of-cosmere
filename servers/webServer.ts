import express, { Express, Request, Response } from "express";
import handlebars from 'express-handlebars';
import bodyParser from 'body-parser';
import path from 'path';
import { getClients } from "./ccWebsocket";
import { CodeHandler } from "../handlers/code";
export const app: Express = express();

app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(bodyParser.json());

app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, '../views'));

app.get('/', (req: express.Request, res: express.Response) => res.render('root', {
    clients: getClients()
}))

app.get("/runAll", (req: Request, res: Response) => {
    res.render('run', {
        one: false,
        all: true,
        clients: getClients()
    })
})

app.get("/runOne", (req: Request, res: Response) => {
    res.render('run', {
        one: true,
        all: false,
        clients: getClients()
    })
})

app.post("/runAll", CodeHandler.postAll)
app.post("/runOne", CodeHandler.postOne)

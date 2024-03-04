import dotenv from 'dotenv';

dotenv.config();

import { app } from './servers/webServer';
import { runWebsocket } from './servers/ccWebsocket';
import { sequelize } from './data/database';
import { logger } from './logging';

if (JSON.parse(process.env.SETUP_DB || 'false') === true) {
  logger.info('Setup DB flag is set, attempting setup');
  sequelize.sync({
    force: false, // Drop the schema and recreate (ONLY IN DEV)
    alter: false, // Attempt to alter existing tables to match the new scema (ONLY IN DEV)
  }).then(() => {
    logger.info('DB model sync completed');
  }).catch((err: any) => {
    logger.error(`Error syncing DB model: ${err}`);
  });
} else {
  logger.info('Skipping DB setup (per environment variable)');
}


runWebsocket();
const port = process.env.serverPort || 8080;
app.listen(port, () => {
  logger.info(`Webserver listening on port ${port}`)
})
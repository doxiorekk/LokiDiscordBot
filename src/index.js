const { LokiClient } = require('./client');
require('dotenv').config();

const client = new LokiClient();
client.login(process.env.TOKEN);

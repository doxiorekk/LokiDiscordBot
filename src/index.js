const { LokiClient } = require('./client');
require('dotenv').config();

require('@sapphire/plugin-subcommands/register');

const client = new LokiClient();
client.login(process.env.TOKEN);

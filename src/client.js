const {
    SapphireClient,
    ApplicationCommandRegistries,
    RegisterBehavior,
} = require('@sapphire/framework');
const { GatewayIntentBits } = require('discord.js');

class LokiClient extends SapphireClient {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
        });
    }

    login(token) {
        ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
            RegisterBehavior.BulkOverwrite,
        );

        ApplicationCommandRegistries.setDefaultGuildIds([
            process.env.DISCORD_GUILD_ID,
            process.env.DISCORD_TEST_GUILD_ID,
        ]);

        return super.login(token);
    }
}

module.exports = { LokiClient };

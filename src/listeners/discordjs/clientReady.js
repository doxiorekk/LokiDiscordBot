const { Listener } = require('@sapphire/framework');
const { twitch } = require('../../lib/twitchClient');

class ClientReadyListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            event: 'clientReady',
        });
    }

    async run(client) {
        this.container.twitch = twitch;

        const { username, id } = client.user;
        this.container.logger.info(
            `Successfully logged in as ${username} (${id})`,
        );
        try {
            await this.container.twitch.init();
        } catch (error) {
            this.container.logger.error(
                'Failed to initialize Twitch Client: ',
                error,
            );
        }
    }
}

module.exports = { ClientReadyListener };

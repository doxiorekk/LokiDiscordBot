const { Listener } = require('@sapphire/framework');
const { twitch } = require('../../lib/twitchClient');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

class ClientReadyListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            event: 'clientReady',
        });
    }

    async run(client) {
        const { username, id } = client.user;
        this.container.logger.info(
            `Successfully logged in as ${username} (${id})`,
        );

        const supportChannelId = process.env.SUPPORT_CHANNEL_ID;
        if (!supportChannelId) {
            this.container.logger.warn(
                'Support channel not found. Skipping auto-deployment of the support panel.',
            );
        }

        try {
            await twitch.init();

            const suppChannel = await client.channels.fetch(supportChannelId);
            if (!suppChannel || !suppChannel.isTextBased()) {
                this.container.logger.error(
                    'Support channel id is invalid or is not a text based channel.',
                );
                return;
            }

            const messages = await suppChannel.messages.fetch({ limit: 15 });
            const existingPanel = messages.find(
                (msg) =>
                    msg.author.id === client.user.id &&
                    msg.embeds.some(
                        (embed) => embed.title === '🎫 Support Tickets',
                    ),
            );

            if (existingPanel) {
                this.container.logger.info(
                    'An existing ticket panel was found. Skipping duplicate creation.',
                );
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🎫 Support Tickets')
                .setDescription(
                    'Need assistance? Click the button below to spin up a private support ticket.',
                )
                .setColor(0x5865f2);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create')
                    .setLabel('Open a Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✉️'),
            );

            await suppChannel.send({ embeds: [embed], components: [row] });
            this.container.logger.info(
                'A fresh ticketing panel has been automatically deployed.',
            );
        } catch (error) {
            this.container.logger.error(
                '[Twitch] Failed to initialize Client: ',
                error,
            );

            this.container.logger.error(
                'Failed to verify or deploy the auto-ticketing panel:',
                error,
            );
        }
    }
}

module.exports = { ClientReadyListener };

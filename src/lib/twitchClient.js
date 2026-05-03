const { container } = require('@sapphire/framework');
const { RefreshingAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { EventSubWsListener } = require('@twurple/eventsub-ws');
const {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

class TwitchClient {
    constructor() {
        // Static secrets stay in .env
        this.clientId = process.env.TWITCH_CLIENT_ID;
        this.clientSecret = process.env.TWITCH_CLIENT_SECRET;
        this.tokenPath = path.join(process.cwd(), './tokens.json');

        this.apiClient = null;
        this.listener = null;
    }

    async init() {
        console.log('[Twitch] Starting Init');

        try {
            const tokenData = JSON.parse(
                await fs.readFileSync(this.tokenPath, 'utf-8'),
            );

            const authProvider = new RefreshingAuthProvider({
                clientId: this.clientId,
                clientSecret: this.clientSecret,
            });

            authProvider.onRefresh(async (userID, newTokenData) => {
                await fs.writeFileSync(
                    this.tokenPath,
                    JSON.stringify(newTokenData, null, 4),
                );
                container.logger.info(
                    '[Twitch] Tokens updated and saved to disk',
                );
            });

            await authProvider.addUserForToken(tokenData, [
                'chat:read',
                'eventsub:read',
            ]);

            this.apiClient = new ApiClient({ authProvider });
            this.listener = new EventSubWsListener({
                apiClient: this.apiClient,
            });

            await this.listener.start();

            await this.setupSubscriptions();
        } catch (error) {
            console.log('[Twitch] Init Crashed', error);
        }
    }

    async setupSubscriptions() {
        const user = await this.apiClient.users.getUserByName('dumdemon_keira');
        const bot = await this.apiClient.users.getUserByName('doxiorekk');
        if (!user) return;

        this.listener.onStreamOnline(bot.id, user.id, async (event) => {
            const channel = await container.client.channels.fetch(
                process.env.MESSAGE_NOTIFICATION_CHANNEL_ID,
            );
            if (!channel) return;
            const stream = await event.getStream();

            if (!stream.title) {
                return 'No title set';
            }
            if (!stream.gameName) {
                return 'Just Chatting';
            }

            const messageContainer = new ContainerBuilder()
                .setAccentColor(0x6441a5)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${event.broadcasterDisplayName} is now LIVE!\n## ${stream.title}`,
                            ),
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.broadcasterId),
                        ),
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### Category\n\`\`\`${stream.gameName}\`\`\``,
                            ),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### Link\n[Click Here](https://twitch.tv/${event.broadcasterName})`,
                            ),
                        ),
                );

            await channel.send({
                components: [messageContainer],
                flags: [MessageFlags.IsComponentsV2],
            });
        });

        console.log(
            `Successfully watching ${user.displayName} via ${bot.displayName}'s token.`,
        );
    }
}

module.exports = { twitch: new TwitchClient() };

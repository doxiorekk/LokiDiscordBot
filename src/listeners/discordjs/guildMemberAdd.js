const { Listener } = require('@sapphire/framework');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { welcomeMessages } = require('../../cfg/welcomeMessages.json');

class UserJoinListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            once: false,
            event: 'guildMemberAdd',
        });
    }

    async run(member) {
        const randomTemplate =
            welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        const randomMessage = randomTemplate.replace(
            '{member}',
            member.toString(),
        );
        const welcomeChannel = member.guild.channels.cache.get(
            process.env.MESSAGE_WELCOME_CHANNEL_ID,
        );

        if (welcomeChannel) {
            const embed = new EmbedBuilder()
                .setTitle('User Joined')
                .setColor('Green')
                .setDescription(randomMessage)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .addFields([
                    {
                        name: 'Total members',
                        value: `${member.guild.memberCount}`,
                        inline: true,
                    },
                ])
                .setFooter({
                    text: 'Provided by: ',
                    iconURL: this.container.client.user.displayAvatarURL(),
                    text: this.container.client.user.tag,
                });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Rules')
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                        'https://discord.com/channels/955975088593846312/1083023568822075462',
                    ),
                new ButtonBuilder()
                    .setLabel('Roles')
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                        'https://discord.com/channels/955975088593846312/1081989207372873778',
                    ),
            );

            try {
                await welcomeChannel.send({
                    embeds: [embed],
                    components: [row],
                });
            } catch (error) {
                this.container.logger.error(
                    `Failed to send welcome message: ${error.message}`,
                );
            }
        }
    }
}

module.exports = { UserJoinListener };

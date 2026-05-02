const { Listener } = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');

class UserLeaveListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            event: 'guildMemberRemove',
        });
    }

    run(member) {
        const logChannel = member.guild.channels.cache.get(
            process.env.MESSAGE_LOG_CHANNEL_ID,
        );

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('User Left')
                .setColor('DarkButNotBlack')
                .setDescription(
                    `\`${member.user.username}\` has broken the pact with Keira`,
                )
                .setThumbnail(member.user.displayAvatarURL())
                .addFields([
                    {
                        name: 'User ID',
                        value: `${member.id}`,
                        inline: true,
                    },
                    {
                        name: 'Total members',
                        value: `${member.guild.memberCount}`,
                        inline: true,
                    },
                ])
                .setFooter({
                    iconURL: this.container.client.user.displayAvatarURL(),
                    text: this.container.client.user.tag,
                });

            logChannel.send({ embeds: [embed] });
        }
    }
}

module.exports = { UserLeaveListener };

const { Listener } = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('#lib/prisma');

class UserLeaveListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            event: 'guildMemberRemove',
        });
    }

    run(member) {
		// Role cache system
		const roleIds = member.roles.cache
            .filter(role => role.id !== member.guild.id && !role.managed)
            .map(role => role.id);

        if (roleIds.length > 0) {
            try {
                await prisma.stickyRole.upsert({
                    where: {
                        userId_guildId: {
                            userId: member.id,
                            guildId: member.guild.id,
                        },
                    },
                    update: {
                        roleIds: roleIds.join(','),
                    },
                    create: {
                        userId: member.id,
                        guildId: member.guild.id,
                        roleIds: roleIds.join(','),
                    },
                });
            } catch (error) {
                this.container.logger.error(
                    `[Sticky Roles] Failed to save roles for ${member.id}: ${error.message}`
                );
            }
        }
		
		// Log system
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

const { Listener } = require('@sapphire/framework');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { welcomeMessages } = require('../../cfg/welcomeMessages.json');
const { prisma } = require('../../lib/prisma');

class UserJoinListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            once: false,
            event: 'guildMemberAdd',
        });
    }

    async run(member) {
        // Track roles we are going to add to the user
        const rolesToAdd = new Set();

        // Sticky Roles System
        try {
            const savedData = await prisma.stickyRole.findUnique({
                where: {
                    userId_guildId: {
                        userId: member.id,
                        guildId: member.guild.id,
                    },
                },
            });

            if (savedData && savedData.roleIds) {
                const savedRoleIds = savedData.roleIds.split(',');

                for (const id of savedRoleIds) {
                    if (member.guild.roles.cache.has(id)) {
                        rolesToAdd.add(id);
                    }
                }
            }
        } catch (error) {
            this.container.logger.error(
                `[Sticky Roles] Failed to check/restore roles: ${error.message}`,
            );
        }

        // Verified User Checkup System
        if (process.env.VERIFIED_ROLE_ID) {
            try {
                const record = await prisma.verifiedUser.findUnique({
                    where: {
                        userId_guildId: {
                            userId: member.id,
                            guildId: member.guild.id, // Fixed: added member.
                        },
                    },
                });

                if (record) {
                    const role = member.guild.roles.cache.get(
                        process.env.VERIFIED_ROLE_ID,
                    ); // Fixed: added member.
                    if (role) {
                        rolesToAdd.add(role.id);
                        this.container.logger.info(
                            `[Verification] Found database record for rejoining user: ${member.user.tag}`,
                        );
                    } else {
                        this.container.logger.warn(
                            `[Verification] Role ID ${process.env.VERIFIED_ROLE_ID} not found in guild cache.`,
                        );
                    }
                }
            } catch (error) {
                this.container.logger.error(
                    `[Verification] Failed to check/restore role: ${error.message}`,
                );
            }
        }

        // Apply all collected roles at once to avoid multiple API calls rate-limits
        if (rolesToAdd.size > 0) {
            try {
                await member.roles.add(
                    Array.from(rolesToAdd),
                    'Restored roles from database cache.',
                );
                this.container.logger.info(
                    `[Roles] Successfully applied ${rolesToAdd.size} total roles to ${member.user.tag}`,
                );
            } catch (error) {
                this.container.logger.error(
                    `[Roles] Failed to apply roles to ${member.id}: ${error.message}`,
                );
            }
        }

        // Welcome Message System
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

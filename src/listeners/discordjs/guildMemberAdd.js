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
        // Verification Role Persistance
        if (process.env.VERIFIED_ROLE_ID) {
            try {
                // Check if the rejoining user exists in our database
                const record = await prisma.VerifiedUser.findUnique({
                    where: {
                        userId_guildId: {
                            userId: member.id,
                            guildId: guild.id,
                        },
                    },
                });

                // If they are in the database, restore their verification role
                if (record) {
                    const role = guild.roles.cache.get(
                        process.env.VERIFIED_ROLE_ID,
                    );
                    if (role) {
                        await member.roles.add(role);
                        this.container.logger.info(
                            `[Verification] Restored role to rejoining user: ${member.user.tag}`,
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

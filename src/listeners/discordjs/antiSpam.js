const { Listener } = require('@sapphire/framework');
const { prisma } = require('../../lib/prisma');

// In memory cache to monitor message frequency
const messageLog = new Map();

// Config
const timeWindow = 3000;
const msgLimit = 10;
const muteDuration = 15 * 60 * 1000;

class AntiSpamListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'antiSpam',
            event: 'messageCreate',
        });
    }

    async run(message) {
        if (message.author.bot || !message.guild || !message.member) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const now = Date.now();

        // Get user's recent timestamps or initialize a new array
        if (!messageLog.has(userId)) {
            messageLog.set(userId, []);
        }

        const timestamps = messageLog.get(userId);
        timestamps.push(now);

        const recentMessages = timestamps.filter(
            (time) => now - time < TIME_WINDOW,
        );
        messageLog.set(userId, recentMessages);

        if (recentMessages.length > MSG_LIMIT) {
            messageLog.set(userId, []); // Reset trace immediately to prevent loop fire

            if (message.deletable) {
                await message.delete().catch(() => null);
            }

            await this.handlePunishment(message, userId, guildId);
        }
    }

    async handlePunishment(message, userId, guildId) {
        const { member, guild, channel } = message;
        const logChannel = guild.channels.cache.get(
            process.env.MESSAGE_LOG_CHANNEL_ID,
        );

        if (!logChannel) {
            try {
                logChannel = await guild.channels.fetch(
                    process.env.MESSAGE_LOG_CHANNEL_ID,
                );
            } catch (error) {
                this.container.logger.error(
                    `Anti-spam error: Could not locate log channel ID`,
                );
                return;
            }
        }

        try {
            // 1. Increment or Create the warning tracking counter in Prisma DB
            const record = await prisma.userWarn.upsert({
                where: {
                    userId_guildId: { userId, guildId },
                },
                update: {
                    warnCount: { increment: 1 },
                },
                create: {
                    userId,
                    guildId,
                    warnCount: 1,
                },
            });

            const currentWarns = record.warnCount;

            // 2. Escalation Matrix
            switch (currentWarns) {
                case 1:
                    // 1st Warn: Simple Warning
                    await logChannel.send(
                        `⚠️ ${message.author}, please stop spamming. This is your **1st warning**.`,
                    );
                    break;

                case 2:
                    // 2nd Warn: Timeout (Mute)
                    if (member.moderatable) {
                        await member.timeout(
                            MUTE_DURATION,
                            'Spamming (2nd Warning)',
                        );
                        await logChannel.send(
                            `🔇 ${message.author} has been timed out for 15 minutes. (**2nd warning**)`,
                        );
                    } else {
                        await logChannel.send(
                            `⚠️ ${message.author} triggered a **2nd warning** but I cannot mute them (Missing Permissions).`,
                        );
                    }
                    break;

                case 3:
                    // 3rd Warn: Kick
                    if (member.kickable) {
                        await member.kick('Spamming (3rd Warning)');
                        await logChannel.send(
                            `👢 **${message.author.tag}** has been kicked from the server. (**3rd warning**)`,
                        );
                    } else {
                        await logChannel.send(
                            `⚠️ ${message.author} triggered a **3rd warning** but I cannot kick them.`,
                        );
                    }
                    break;

                case 4:
                default:
                    // 4th Warn: Ban (And clear DB tracking for this user on this guild)
                    if (member.bannable) {
                        await member.ban({
                            reason: 'Spamming (4th Warning - Max limit reached)',
                        });
                        await logChannel.send(
                            `🔨 **${message.author.tag}** has been permanently banned. (**4th warning**)`,
                        );

                        // Clear database entry since they are permanently banned
                        await prisma.userWarn.delete({
                            where: { userId_guildId: { userId, guildId } },
                        });
                    } else {
                        await logChannel.send(
                            `⚠️ ${message.author} triggered a **4th warning** but I cannot ban them.`,
                        );
                    }
                    break;
            }
        } catch (error) {
            this.container.logger.error(
                'Error handling anti-spam system execution:',
                error,
            );
        }
    }
}

module.exports = { AntiSpamListener };

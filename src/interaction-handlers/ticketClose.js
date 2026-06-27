const {
    InteractionHandler,
    InteractionHandlerTypes,
} = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const { prisma } = require('../lib/prisma');

class CloseTicketHandler extends InteractionHandler {
    constructor(ctx, options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button,
        });
    }

    parse(interaction) {
        if (interaction.customId !== 'ticket_close') return this.none();
        return this.some();
    }

    async run(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const ticket = await prisma.ticket.findUnique({
            where: { channelId: interaction.channel.id },
        });

        if (!ticket) {
            return interaction.editReply({
                content:
                    'Fatal error: No database reference found for this channel.',
            });
        }

        await interaction.editReply({ content: '🔒 Closing ticket...' });

        let attachment;

        try {
            // Generate the standalone HTML transcript file
            attachment = await discordTranscripts.createTranscript(
                interaction.channel,
                {
                    limit: -1, // -1 fetches ALL messages in the channel history
                    fileName: `transcript-${interaction.channel.name}.html`,
                    saveImages: true, // Caches images locally in the file so they don't break later
                    poweredBy: false, // Removes the library's footer watermark
                },
            );
        } catch (error) {
            console.error('Failed to generate transcript:', error);
            return interaction.editReply({
                content:
                    '⚠️ Failed to close the ticket. Closure aborted for data safety.',
            });
        }

        const logChannelId = process.env.TICKETS_LOG_CHANNEL_ID;

        if (logChannelId) {
            try {
                const logChannel =
                    await interaction.guild.channels.fetch(logChannelId);

                if (logChannel) {
                    const ticketUser = await interaction.client.users
                        .fetch(ticket.userId)
                        .catch(() => null);

                    const logEmbed = new EmbedBuilder()
                        .setTitle('📁 Ticket Archived')
                        .setColor(0x3498db)
                        .addFields(
                            {
                                name: 'Channel Name',
                                value: `\`${interaction.channel.name}\``,
                                inline: true,
                            },
                            {
                                name: 'Opened By',
                                value: ticketUser
                                    ? `${ticketUser.tag} (\`${ticket.userId}\`)`
                                    : 'Unknown User',
                                inline: true,
                            },
                            {
                                name: 'Closed By',
                                value: `${interaction.user.tag} (\`${interaction.user.id}\`)`,
                                inline: true,
                            },
                        )
                        .setTimestamp();

                    await logChannel.send({
                        embeds: [logEmbed],
                        files: [attachment],
                    });
                }
            } catch (logError) {
                console.error(
                    'Could not send transcript to the logging channel:',
                    logError,
                );
            }
        }

        await prisma.ticket.update({
            where: { channelId: interaction.channel.id },
            data: { status: 'CLOSED' },
        });

        await interaction.editReply({
            content:
                '✅ Ticket closed successfully! Channel self-destructing in 5 seconds...',
        });

        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error('Failed to purge ticket channel safely:', error);
            }
        }, 5000);
    }
}

module.exports = { CloseTicketHandler };

const {
    InteractionHandler,
    InteractionHandlerTypes,
} = require('@sapphire/framework');
const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { prisma } = require('#lib/prisma');

class CreateTicketHandler extends InteractionHandler {
    constructor(context, options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button,
        });
    }

    parse(interaction) {
        if (interaction.customId !== 'ticket_create') return this.none();
        return this.some();
    }

    async run(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const existingTicket = await prisma.ticket.findFirst({
            where: {
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                status: 'OPEN',
            },
        });

        if (existingTicket) {
            return interaction.editReply({
                content: `You already have an active ticket open here: <#${existingTicket.channelId}>`,
            });
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: process.env.TICKET_CATEGORY_ID, // 👈 This assigns the channel to your category
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                    ],
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                    ],
                },
            ],
        });

        await prisma.ticket.create({
            data: {
                channelId: ticketChannel.id,
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                status: 'OPEN',
            },
        });

        const embed = new EmbedBuilder()
            .setTitle(`Ticket Opened`)
            .setDescription(
                `Welcome ${interaction.user}! State your inquiry here. Support staff will respond shortly.`,
            )
            .setColor(0x2ecc71);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒'),
        );

        await ticketChannel.send({
            content: `${interaction.user} Setup complete.`,
            embeds: [embed],
            components: [row],
        });
        return interaction.editReply({
            content: `Your support ticket has been built: <#${ticketChannel.id}>`,
        });
    }
}

module.exports = { CreateTicketHandler };

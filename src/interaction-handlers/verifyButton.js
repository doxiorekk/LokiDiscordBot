const {
    InteractionHandler,
    InteractionHandlerTypes,
} = require('@sapphire/framework');
const { prisma } = require('#lib/prisma');

class VerificationButtonHandler extends InteractionHandler {
    constructor(context, options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button,
        });
    }

    parse(interaction) {
        if (interaction.customId !== 'verify_button') return this.none();
        return this.some();
    }

    async run(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const { guild, member } = interaction;
        const role = guild.roles.cache.get(process.env.VERIFIED_ROLE_ID);

        if (!role) {
            return interaction.editReply({
                content:
                    '❌ The verification role could not be found. Please contact an admin.',
            });
        }

        try {
            // Upsert ensures they are marked as verified in the DB without throwing duplicates
            await prisma.verifiedUser.upsert({
                where: {
                    userId_guildId: {
                        userId: member.id,
                        guildId: guild.id,
                    },
                },
                update: {}, // No updates needed if they already exist
                create: {
                    userId: member.id,
                    guildId: guild.id,
                },
            });

            // Assign the role to the member
            if (!member.roles.cache.has(process.env.VERIFIED_ROLE_ID)) {
                await member.roles.add(role);
            }

            return interaction.editReply({
                content: '✅ You have been successfully verified!',
            });
        } catch (error) {
            this.container.logger.error('Verification Error:', error);
            return interaction.editReply({
                content:
                    '❌ Something went wrong while processing your verification.',
            });
        }
    }
}

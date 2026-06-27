const { Command } = require('@sapphire/framework');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');

class SetupVerificationCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'setupVerification',
            description:
                'Creates a verification message with a button to verify.',
            preconditions: ['GuildOnly'],
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        );
    }

    async chatInputRun(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('✅ Verify Me')
                .setStyle(ButtonStyle.Success),
        );

        await interaction.reply({
            content:
                '### Verification\nClick the button below to verify yourself.',
            components: [row],
        });
    }
}

module.exports = { SetupVerificationCommand };

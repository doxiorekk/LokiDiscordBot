const { Command } = require('@sapphire/framework');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    User,
} = require('discord.js');

class UserInfoCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'userinfo',
            description: 'Display information about a user',
        });
    }

    async chatInputRun(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild
            ? await interaction.guild.members.fetch(user.id).catch(() => null)
            : null;

        const container = new ContainerBuilder()
            .setAccentColor(member ? member.displayColor : 0xffffff)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# Information | ${user.username}`,
                ),
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `User ID:\n\`\`\`${user.id}\`\`\`\nAccount Created\n\`\`\`${user.createdAt.toUTCString()}\`\`\``,
                        ),
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(
                            user.displayAvatarURL({ size: 1024 }),
                        ),
                    ),
            );

        if (member) {
            container
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## Member Info\nMember Joined:\n\`\`\`${member.joinedAt.toUTCString()}\`\`\`\n## Roles\n${
                            member.roles.cache
                                .filter(
                                    (role) => role.id !== interaction.guild.id,
                                )
                                .sort((a, b) => b.position - a.position)
                                .map((role) => role.toString())
                                .join(', ') || 'None'
                        }`,
                    ),
                );
        }

        return interaction.reply({
            components: [container],
            flags: ['Ephemeral', 'IsComponentsV2'],
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('The user to get info about')
                        .setRequired(false),
                ),
        );
    }
}

module.exports = { UserInfoCommand };

const { Command } = require('@sapphire/framework');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
} = require('discord.js');
const { createRivalsClient } = require('rivalsjs');
const { getPlayer } = require('rivalsjs/v1');
const api = createRivalsClient({ apiKey: process.env.MARVEL_RIVALS_API });

class MarvelRivalsStatsCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'mrstats',
            description: 'Fetch Marvel Rivals player stats',
            cooldownDelay: 5000,
        });
    }

    async chatInputRun(interaction) {
        await interaction.deferReply();

        const playerQuery = interaction.options.getString('player');
        const [name, tag] = playerQuery.split('#');

        // if (!tag) {
        //     return interaction.editReply('❌ Format error: Use `Name#1234`');
        // }

        const result = await getPlayer(api, { name, tag });

        if (result.isErr()) {
            return interaction.editReply(
                '❌ Player not found in the Multiverse',
            );
        }

        const data = result.value;

        const container = new ContainerBuilder()
            .setAccentColor(0xffffff)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# Statistics | ${data.playerName}`,
                ),
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Rank:\n\`\`\`${data.rankName}\`\`\`\nLevel:\n\`\`\`${data.level.toString()}\`\`\`\nWin Rate:\n\`\`\`${data.winRate}%\`\`\``,
                    ),
                ),
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## Top Hero | ${data.playerName}\n\`\`\`${data.topHero}\`\`\`\nK/D:\n\`\`\`${data.kdRatio}\n\`\`\`Total Matches:\n\`\`\`${data.totalMatches}\`\`\``,
                ),
            );
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName('player')
                        .setDescription('Username or UID')
                        .setRequired(true),
                ),
        );
    }
}

module.exports = { MarvelRivalsStatsCommand };

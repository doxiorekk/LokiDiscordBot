const { Command } = require('@sapphire/framework');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    MessageFlags,
    ThumbnailBuilder,
} = require('discord.js');

class ValorantStatsCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'vstats',
            description: 'Fetch Valorant player stats from Tracker.gg',
            cooldownDelay: 5000,
        });
    }

    async chatInputRun(interaction) {
        await interaction.deferReply();

        const playerQuery = interaction.options.getString('player');
        const [name, tag] = playerQuery.split('#');

        const url = `https://api.henrikdev.xyz/valorant/v3/mmr/eu/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: process.env.HENRIK_API_KEY || '',
                    'User-Agent': 'LokiDiscordBot/1.0',
                },
            });

            const result = await response.json();

            if (response.status !== 200 || !result || result.status !== 200) {
                const errorMsg =
                    result?.errors?.[0]?.message ||
                    result?.message ||
                    'Player not found or profile is private.';
                return interaction.editReply(`❌ API Error: ${errorMsg}`);
            }

            const playerData = result.data;
            const currentData = playerData?.current;

            if (!currentData) {
                return interaction.editReply(
                    '❌ Could not retrieve matchmaking data for this player.',
                );
            }

            const rank = currentData.tier.name;
            const elo = currentData.elo || 0;
            const rrChange = currentData.last_change ?? 0;
            const rrString = rrChange >= 0 ? `+${rrChange}` : `${rrChange}`;
            const peak = playerData?.peak.tier.name;
            const peakSeason = playerData?.peak.season.short;

            const container = new ContainerBuilder()
                .setAccentColor(0xff4655) // Valorant Red
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# Statistics | ${playerData.account.name}#${playerData.account.tag}`,
                    ),
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Rank:\n\`\`\`${rank}\`\`\`\n` +
                            `Elo:\n\`\`\`${elo}\`\`\`\n` +
                            `Last Match RR:\n\`\`\`${rrString} RR\`\`\``,
                    ),
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Peak rank:\n\`\`\`${peak}\`\`\`\n` +
                            `Peak Season:\n\`\`\`${peakSeason}\`\`\`\n`,
                    ),
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(
                            new ThumbnailBuilder({
                                media: {
                                    url: this.container.client.user.displayAvatarURL(
                                        { extension: 'png', size: 128 },
                                    ),
                                },
                            }),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `-# ${this.container.client.user.tag} • Data provided by HenrikDev API`,
                            ),
                        ),
                );

            // .addSeparatorComponents(new SeparatorBuilder())
            // .addTextDisplayComponents(
            //     new TextDisplayBuilder().setContent(
            //         `## Performance Details\n` +
            //             `Headshot %:\n\`\`\`${stats.headshotPercentage?.displayValue || '0%'}\`\`\`\n` +
            //             `Damage/Round:\n\`\`\`${stats.damagePerRound?.displayValue || '0'}\`\`\`\n` +
            //             `Matches Played:\n\`\`\`${stats.matchesPlayed?.displayValue || '0'}\`\`\``,
            //     ),
            // );

            return interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply(
                '❌ An unexpected error occurred while fetching stats.',
            );
        }
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName('player')
                        .setDescription('Riot ID (e.g. TenZ#0505)')
                        .setRequired(true),
                ),
        );
    }
}

module.exports = { ValorantStatsCommand };

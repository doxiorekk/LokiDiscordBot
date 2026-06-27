const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { prisma } = require('#lib/prisma'); // Retaining your path alias layout

class SyncVerifiedCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'syncverified',
            description:
                'Pre-emptively backups and syncs verified users to the database.',
            preconditions: ['GuildOnly'],
            // Restrict this heavy operation to server Administrators only
            requiredUserPermissions: [PermissionFlagsBits.Administrator],
        });
    }

    // Registers this as a modern Slash Command
    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder.setName(this.name).setDescription(this.description),
        );
    }

    async chatInputRun(interaction) {
        const { guild } = interaction;
        const verifiedRoleId = process.env.VERIFIED_ROLE_ID;

        if (!verifiedRoleId) {
            return interaction.reply({
                content:
                    '❌ `VERIFIED_ROLE_ID` is not configured in your environment variables.',
                ephemeral: true,
            });
        }

        const role = guild.roles.cache.get(verifiedRoleId);
        if (!role) {
            return interaction.reply({
                content: `❌ The verification role (ID: \`${verifiedRoleId}\`) could not be found in this server.`,
                ephemeral: true,
            });
        }

        // Defer reply because fetching hundreds/thousands of members takes time
        await interaction.deferReply({ ephemeral: true });

        try {
            // 1. Fetch ALL members from Discord API (guarantees we bypass partial caches)
            await interaction.editReply({
                content: '📥 Fetching all members from Discord... Please wait.',
            });
            const allMembers = await guild.members.fetch();
            const humanMembers = allMembers.filter(
                (member) => !member.user.bot,
            );

            // 2. Fetch all existing verification records for this server from Prisma
            await interaction.editReply({
                content: '🔍 Analyzing existing database backups...',
            });
            const existingRecords = await prisma.verifiedUser.findMany({
                where: { guildId: guild.id },
            });

            // Turn DB records into a Set for constant-time (O(1)) existence lookups
            const verifiedDbSet = new Set(
                existingRecords.map((record) => record.userId),
            );

            const toCreate = [];
            let identicalCount = 0;

            // 3. Compare current Discord state with our Database state
            for (const [userId, member] of humanMembers) {
                const hasVerifiedRole = member.roles.cache.has(verifiedRoleId);

                // If they don't have the verified role, skip them
                if (!hasVerifiedRole) continue;

                if (verifiedDbSet.has(userId)) {
                    // User has the role on Discord AND is already in our DB setup
                    identicalCount++;
                } else {
                    // User has the role on Discord but is missing from the DB
                    toCreate.push({
                        userId,
                        guildId: guild.id,
                    });
                }
            }

            // 4. Execute optimized database writes
            await interaction.editReply({
                content: `💾 Writing updates... (New Backups: ${toCreate.length} | Untouched: ${identicalCount})`,
            });

            // Batch insert all brand new entries at once using createMany
            if (toCreate.length > 0) {
                await prisma.verifiedUser.createMany({
                    data: toCreate,
                });
            }

            // 5. Final Success Summary
            const totalProcessed = toCreate.length + identicalCount;
            await interaction.editReply({
                content: `✅ **Verification Sync Complete!**\n• Total verified members found: \`${totalProcessed}\`\n• New backups created: \`${toCreate.length}\`\n• Already up-to-date: \`${identicalCount}\``,
            });
        } catch (error) {
            this.container.logger.error(
                '[Sync Verified Command] Critical error running verification sync:',
                error,
            );
            await interaction.editReply({
                content: `❌ An error occurred during the sync: \`${error.message}\``,
            });
        }
    }
}

module.exports = { SyncVerifiedCommand };

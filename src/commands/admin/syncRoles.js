const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { prisma } = require('#lib/prisma'); // Adjust the path to your lib folder

class SyncRolesCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'syncroles',
            description:
                "Pre-emptively backups and syncs everyone's roles to the database.",
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

            // 2. Fetch all existing sticky role records for this server from Prisma
            await interaction.editReply({
                content: '🔍 Analyzing existing database backups...',
            });
            const existingRecords = await prisma.stickyRole.findMany({
                where: { guildId: guild.id },
            });

            // Turn DB records into a Map for constant-time (O(1)) lookups
            const recordMap = new Map(
                existingRecords.map((record) => [
                    record.userId,
                    record.roleIds,
                ]),
            );

            const toCreate = [];
            const toUpdate = [];
            let identicalCount = 0;

            // 3. Compare current Discord state with our Database state
            for (const [userId, member] of humanMembers) {
                const roleIds = member.roles.cache
                    .filter((role) => role.id !== guild.id && !role.managed)
                    .map((role) => role.id);

                // Skip users with no persistent roles (just @everyone)
                if (roleIds.length === 0) continue;

                const roleString = roleIds.join(',');

                if (recordMap.has(userId)) {
                    // If they have a record, check if their roles actually changed
                    if (recordMap.get(userId) === roleString) {
                        identicalCount++; // No changes needed, skip DB write entirely!
                    } else {
                        toUpdate.push({ userId, roleIds: roleString });
                    }
                } else {
                    // Brand new record needed
                    toCreate.push({
                        userId,
                        guildId: guild.id,
                        roleIds: roleString,
                    });
                }
            }

            // 4. Execute optimized database writes
            await interaction.editReply({
                content: `💾 Writing updates... (New: ${toCreate.length} | Changed: ${toUpdate.length} | Untouched: ${identicalCount})`,
            });

            // Batch insert all brand new entries at once
            if (toCreate.length > 0) {
                await prisma.stickyRole.createMany({
                    data: toCreate,
                });
            }

            // Run updates sequentially (or chunked) for members whose roles changed
            for (const update of toUpdate) {
                await prisma.stickyRole.update({
                    where: {
                        userId_guildId: {
                            userId: update.userId,
                            guildId: guild.id,
                        },
                    },
                    data: { roleIds: update.roleIds },
                });
            }

            // 5. Final Success Summary
            const totalProcessed =
                toCreate.length + toUpdate.length + identicalCount;
            await interaction.editReply({
                content: `✅ **Role Sync Complete!**\n• Total users evaluated: \`${totalProcessed}\`\n• New backups created: \`${toCreate.length}\`\n• Outdated backups updated: \`${toUpdate.length}\`\n• Already up-to-date: \`${identicalCount}\``,
            });
        } catch (error) {
            this.container.logger.error(
                '[Sync Command] Critical error running role sync:',
                error,
            );
            await interaction.editReply({
                content: `❌ An error occurred during the sync: \`${error.message}\``,
            });
        }
    }
}

module.exports = { SyncRolesCommand };

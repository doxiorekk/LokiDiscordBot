const { Listener } = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');

class MessageDeleteListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            event: 'messageDelete',
        });
    }

    run(message) {
        if (
            message.author.bot ||
            !message.guild ||
            message.guild.category === process.env.MOD_CATEGORY_ID
        )
            return;

        const logChannel = message.guild.channels.cache.get(
            process.env.MESSAGE_LOG_CHANNEL_ID,
        );

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('Message Deleted')
                .setColor('Red')
                .setDescription(message.content)
                .setThumbnail(message.author.displayAvatarURL())
                .addFields([
                    {
                        name: 'Author',
                        value: `${message.author} (\`${message.author.id}\`)`,
                        inline: true,
                    },
                    {
                        name: 'Channel',
                        value: `${message.channel} (\`${message.channel.id}\`)`,
                        inline: true,
                    },
                ])
                .setFooter({
                    iconURL: this.container.client.user.displayAvatarURL(),
                    text: this.container.client.user.tag,
                });

            logChannel.send({ embeds: [embed] });
        }
    }
}

module.exports = { MessageDeleteListener };

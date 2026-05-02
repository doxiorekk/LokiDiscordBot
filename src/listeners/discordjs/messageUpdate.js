const { Listener } = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');

class MessageUpdateListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            event: 'messageUpdate',
        });
    }

    run(oldMessage, newMessage) {
        if (
            newMessage.author.bot ||
            !newMessage.guild ||
            newMessage.guild.category === process.env.MOD_CATEGORY_ID
        )
            return;
        if (oldMessage.content === newMessage.content) return;

        const logChannel = newMessage.guild.channels.cache.get(
            process.env.MESSAGE_LOG_CHANNEL_ID,
        );

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('Message Edited')
                .setColor('Yellow')
                .setThumbnail(newMessage.author.displayAvatarURL())
                .addFields([
                    {
                        name: 'Author',
                        value: `${newMessage.author} (\`${newMessage.author.id}\`)`,
                        inline: true,
                    },
                    {
                        name: 'Channel',
                        value: `${newMessage.channel} (\`${newMessage.channel.id}\`)`,
                        inline: true,
                    },
                    {
                        name: 'Old Message',
                        value: oldMessage.content,
                    },
                    {
                        name: 'New Message',
                        value: newMessage.content,
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

module.exports = { MessageUpdateListener };

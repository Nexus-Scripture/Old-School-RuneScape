module.exports = {
    setLoggingChannel: {
        execute: async (interaction) => {
            const logChannel = interaction.options.getChannel('log-channel');
            if (!logChannel) {
                return interaction.reply('Please provide a valid channel.');
            }
            // Save the log channel to the server database
            // This is just a placeholder, replace with your actual database logic
            await Server.update({ logChannelId: logChannel.id }, { where: { id: interaction.guild.id } });
            return interaction.reply(`Log channel set to ${logChannel}`);
        }
    },
}
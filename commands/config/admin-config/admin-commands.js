module.exports = {
    addTeams: {
        execute: async (interaction) => {
            const teamName = interaction.options.getString('team-name');
            const teamMembers = interaction.options.getString('team-members').split(',');

            try {
                // Check if the team already exists
                const existingTeam = await Teams.findOne({ where: { teamName } });
                if (existingTeam) {
                    const embed = new EmbedBuilder()
                        .setTitle('Error Adding Team')
                        .setDescription('A team with that name already exists.')
                        .setColor(0xFF0000);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Add the team to the database
                await Teams.create({
                    guildId: interaction.guild.id,
                    teamName,
                    teamMembers: teamMembers.map(member => member.trim()),
                    teamPoints: 0
                });

                const embed = new EmbedBuilder()
                    .setTitle('Team Added')
                    .setDescription(`Team ${teamName} has been added.`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error adding team to database:', error);
                const embed = new EmbedBuilder()
                    .setTitle('Error Adding Team')
                    .setDescription('There was an error adding the team.')
                    .setColor(0xFF0000);
                interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
}
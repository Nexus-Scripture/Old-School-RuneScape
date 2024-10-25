const { EmbedBuilder } = require('discord.js');
const { User, Teams } = require('../../model/model.js');

const {
    executeLeaderboard
} = require('../utils-functions/utils-leaderboards.js');

module.exports = {
    leaderboard: {
        execute: async (interaction) => {
            try {
                executeLeaderboard(interaction.guild, interaction.channel);
            } catch (err) {
                console.error("Leaderboard error: ", err);
            }
        }
    },

    // //
    teamLeaderboard: {
        execute: async (interaction) => {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('Team Leaderboard')
                    .setDescription('Placeholder for team leaderboard')
                    .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
            } catch (err) { console.error("Team leaderboard error: ", err); }
        }
    },

    viewTeams: {
        execute: async (interaction) => {
            try {
                const teams = await Teams.findAll({ where: { guildId: interaction.guild.id } });
                if (teams.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('View Teams')
                        .setDescription('No teams found in the database.')
                        .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
                } else {
                    const teamList = teams.map(team => `- ${team.teamName}`).join('\n');
                    const embed = new EmbedBuilder()
                        .setTitle('View Teams')
                        .setDescription(teamList)
                        .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
                }
            } catch (err) { console.error("View teams error: ", err); }
        }
    },

    viewTeam: {
        execute: async (interaction) => {
            try {
                const teamName = interaction.options.getString('team-name');
                const team = await Teams.findOne({ where: { teamName, guildId: interaction.guild.id } });
                if (!team) {
                    const embed = new EmbedBuilder()
                        .setTitle('🚫 View Team')
                        .setDescription('Team not found in the database.')
                        .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
                } else {
                    const teamMembers = team.teamMembers ? team.teamMembers.split(',') : [];
                    const teamMembersList = teamMembers.length > 0 ? teamMembers.map(member => `- ${member}`).join('\n') : 'No Members Yet';
                    const embed = new EmbedBuilder()
                        .setTitle(`🛡️ Team ${team.teamName}`)
                        .setDescription(team.teamDescription || 'No description available.')
                        .addFields(
                            { name: '👑 Team Leader', value: `<@${team.teamLeader}>`, inline: true },
                            { name: '⭐️ Team Points', value: team.teamPoints.toString(), inline: true },
                            { name: '👥 Team Members', value: teamMembersList, inline: false },
                        )
                        .setThumbnail(team.teamImage || null)
                        .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
                }
            } catch (err) { console.error("View team error: ", err); }
        }
    },

    teamPoints: {
        execute: async (interaction) => {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('Team Points')
                    .setDescription('Placeholder for team points')
                    .setColor('#0099ff');
                await interaction.reply({ embeds: [embed] });
            } catch (err) { console.error("Team points error: ", err); }
        }
    },

    // //

    viewRank: {
        execute: async (interaction) => {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('View Rank')
                    .setDescription('Placeholder for view rank')
                    .setColor('#0099ff');
                await interaction.reply({ embeds: [embed] });
            } catch (err) { console.error("View rank error: ", err); }
        }
    }
}
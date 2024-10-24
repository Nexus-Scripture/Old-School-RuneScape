const { EmbedBuilder } = require('discord.js');
const { User } = require('../../model/model.js');

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

    teamInfo: {
        execute: async (interaction) => {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('Team Info')
                    .setDescription('Placeholder for team info')
                    .setColor('#0099ff');
                await interaction.reply({ embeds: [embed] });
            } catch (err) { console.error("Team info error: ", err); }
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
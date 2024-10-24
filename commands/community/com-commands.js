module.exports = {
    leaderboard: {
        execute: async (interaction) => {
            try {
                // send reply to interaction
                await interaction.reply('Placeholder for leaderboard');
            } catch (err) {
                console.error("Leaderboard error: ", err);
            }
        }
    },

    // //
    teamLeaderboard: {
        execute: async (interaction) => {
            try {
                await interaction.reply('Placeholder for team leaderboard');
            } catch (err) { console.error("Team leaderboard error: ", err); }
        }
    },

    teamInfo: {
        execute: async (interaction) => {
            try {
                await interaction.reply('Placeholder for team info');
            } catch (err) { console.error("Team info error: ", err); }
        }
    },

    teamPoints: {
        execute: async (interaction) => {
            try {
                await interaction.reply('Placeholder for team points');
            } catch (err) { console.error("Team points error: ", err); }
        }
    },

    // //

    viewRank: {
        execute: async (interaction) => {
            try {
                await interaction.reply('Placeholder for view rank');
            } catch (err) { console.error("View rank error: ", err); }
        }
    }
}
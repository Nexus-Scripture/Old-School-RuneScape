const { EmbedBuilder } = require('discord.js');


module.exports = {
    help_menu_selected: {
        execute: async (interaction) => {
            try {
                let embed;
                switch (interaction.values[0]) {
                    case "admin_commands":
                        embed = new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle("Admin Commands").setDescription(`
                            • /add-points - Add points to a user
                            • /remove-points - Remove points from a user
                            • /announce - Send an announcement to the server
                            `);
                        break;

                    case "community_commands":
                        embed = new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle("Community Commands").setDescription(`
                            • /view-teams - View all teams in the server
                            • /view-team - View a specific team
                            • /leaderboard - View the server leaderboard
                            • /team-leaderboard - View the team leaderboard
                            • /profile - View your profile
                            • /view-ranks - View all ranks in the server
                            `);
                        break;

                    case "configuration_commands":
                        embed = new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle("Configuration Commands").setDescription(`
                            • /add-team - Add a new team to the server
                            • /remove-team - Remove a team from the server
                            • /edit-team - Edit a team's details
                            • /add-rank - Set up a new rank
                            • /edit-rank - Edit a rank's details
                            • /remove-rank - Remove a rank from the server
                            `);
                        break;

                    case "owner_commands":
                        // Check if the user is the bot owner
                        if (interaction.user.id !== process.env.OWNER
                        ) {
                            return interaction.reply({
                                content:
                                    "You do not have permission to view this section.",
                                ephemeral: true,
                            });
                        }
                        embed = new EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle("Owner Commands").setDescription(`
                            • List of owner commands
                            `);
                        break;

                    case "command_help":
                        embed = new EmbedBuilder()
                            .setColor(0xffa500)
                            .setTitle("Help With Commands").setDescription(`
                                All commands use slash commands. If you want a new command or feature, please contact the [bot owner](https://discord.com/invite/W3bZxykvAX).
                            `);
                        break;

                    default:
                        return;
                }

                // Validate and send the embed
                if (
                    embed?.data &&
                    (embed.data.title || embed.data.description)
                ) {
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    }); // Use update to edit the original message
                } else {
                    console.error(
                        "Attempted to send an embed with missing or invalid fields."
                    );
                    await interaction.reply({
                        content:
                            "There was an error generating the command list. Please try again later.",
                        ephemeral: true,
                    });
                }
            } catch (err) {
                return;
            }
        },
    },
};

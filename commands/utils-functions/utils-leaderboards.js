const { User, Teams } = require('../../model/model.js');

async function executeLeaderboard(guild, channel) {
    const serverId = guild.id;

    try {
        // Fetch user data from the database using Sequelize
        const users = await User.findAll({
            where: { guildId: serverId },
            order: [
                ['points', 'DESC']
            ],
            limit: 10  // Limit to top 10
        });

        if (!users || users.length === 0) {
            return channel.send("No one has earned any points yet!");
        }

        // Fetch members and prepare leaderboard data
        const leaderboard = await Promise.all(users.map(async user => {
            let member = guild.members.cache.get(user.userId);
            if (!member) {
                try {
                    member = await guild.members.fetch(user.userId); // Fetch member if not cached
                } catch (error) {
                    console.error(`Failed to fetch member with ID: ${user.userId}`);
                    return null; // Skip users who can't be fetched
                }
            }

            return {
                displayName: member ? member.displayName : "Unknown User",
                xp: user.points
            };
        }));

        const validLeaderboard = leaderboard.filter(user => user !== null); // Remove null entries

        // Prepare fields for leaderboard
        const usersField = validLeaderboard.map((user, index) => `${index + 1}. ${user.displayName} [Points ${user.points}]`).join('\n');

        // Create leaderboard embed
        const leaderboardEmbed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle("Server Leaderboard")
            .addFields(
                { name: "Top 10", value: usersField, inline: true }
            )
            .setTimestamp();

        await channel.send({ embeds: [leaderboardEmbed] });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return channel.send("There was an error retrieving the leaderboard.");
    }
}

async function executeTeamLeaderboard(guild, channel) {
    const serverId = guild.id;

    try {
        // Fetch team data from the database using Sequelize
        const teams = await Teams.findAll({
            where: { guildId: serverId },
            order: [
                ['points', 'DESC']
            ],
            limit: 10  // Limit to top 10
        });

        if (!teams || teams.length === 0) {
            return channel.send("No teams have earned any points yet!");
        }

        // Prepare fields for leaderboard
        const teamsField = teams.map((team, index) => `${index + 1}. ${team.teamName} [Points ${team.points}]`).join('\n');

        // Create leaderboard embed
        const leaderboardEmbed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle("Team Leaderboard")
            .addFields(
                { name: "Top 10", value: teamsField, inline: true }
            )
            .setTimestamp();

        await channel.send({ embeds: [leaderboardEmbed] });

    } catch (error) {
        console.error("Error fetching team leaderboard:", error);
        return channel.send("There was an error retrieving the team leaderboard.");
    }
}

module.exports = {
    executeLeaderboard,
    executeTeamLeaderboard
}
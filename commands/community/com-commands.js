const { EmbedBuilder } = require('discord.js');
const { User, Teams, MilestoneLevels } = require('../../model/model.js');
const {
    roleChecker
} = require('../utils-functions/utils-handles.js');

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
                const milestoneLevels = await MilestoneLevels.findAll({ where: { guildId: interaction.guild.id } });
                if (milestoneLevels.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('🏆 View Rank')
                        .setDescription('No milestone levels set for this guild.')
                        .setColor('#0099ff');
                    await interaction.reply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle('🏆 View Rank')
                        .setDescription('Milestone levels for this guild:')
                        .setColor('#0099ff');
                    milestoneLevels.forEach((level, index) => {
                        embed.addFields(
                            { name: `🔹 ${index + 1}. ${level.name}`, value: `⭐️ Points: ${level.points}, 🕒️ Duration: ${level.durationDays} days`, inline: false }
                        );
                    });
                    await interaction.reply({ embeds: [embed] });
                }
            } catch (err) { console.error("View rank error: ", err); }
        }
    },

    // //

    profile: {
        execute: async (interaction) => {
            try {
                const user = interaction.user;
                const guildId = interaction.guild.id;
                const userId = user.id;
                let userPoints, userTeam, userRoles, milestoneLevels, userRanks, profilePicture, leadingTeams;

                // Check if the user exists in the database
                let userExists = await User.findOne({ where: { userId, guildId } });
                if (!userExists) {
                    // If the user doesn't exist, create a new entry for them with default values
                    await User.create({
                        userId,
                        username: user.tag,
                        guildId,
                        points: 0,
                        teamId: null,
                        days: 0,
                    });
                }

                // Fetch user data from the database
                userPoints = await User.findOne({ where: { userId, guildId } }).then(user => user.points).catch(console.error);
                userTeam = await Teams.findOne({ where: { teamLeader: userId } }).then(team => team ? `:shield: ${team.teamName}` : ':shield: None').catch(console.error);
                userRoles = interaction.member.roles.cache.map(role => role.id);
                milestoneLevels = await MilestoneLevels.findAll({ where: { guildId } });
                userRanks = await roleChecker(userRoles, milestoneLevels).catch(console.error);
                profilePicture = user.displayAvatarURL({ dynamic: true, size: 1024 });

                // Fetch teams led by the user
                leadingTeams = await Teams.findAll({ where: { teamLeader: userId } }).then(teams => teams.map(team => team.teamName)).catch(console.error);

                let color = 0x0099ff; // Default color
                if (userRanks.includes('Master')) {
                    color = 0xff0000; // Red for Master rank
                } else if (userRanks.includes('Dragon')) {
                    color = 0x9900ff; // Purple for Dragon rank
                } else if (userRanks.includes('Monarch')) {
                    color = 0x9900ff; // Purple for Monarch rank
                } else if (userRanks.includes('Paladin')) {
                    color = 0x00ff00; // Green for Paladin rank
                } else if (userRanks.includes('Templar')) {
                    color = 0x00ff00; // Green for Templar rank
                } else if (userRanks.includes('Berserker')) {
                    color = 0xff9900; // Orange for Berserker rank
                } else if (userRanks.includes('Barbarian')) {
                    color = 0xff9900; // Orange for Barbarian rank
                } else if (userRanks.includes('Warrior')) {
                    color = 0xff9900; // Orange for Warrior rank
                } else if (userRanks.includes('Fighter')) {
                    color = 0xffff00; // Yellow for Fighter rank
                } else if (userRanks.includes('Bruiser')) {
                    color = 0xffff00; // Yellow for Bruiser rank
                } else if (userRanks.includes('Scourge')) {
                    color = 0xffff00; // Yellow for Scourge rank
                } else if (userRanks.includes('Brawler')) {
                    color = 0x00ffff; // Cyan for Brawler rank
                } else if (userRanks.includes('Goon')) {
                    color = 0x00ffff; // Cyan for Goon rank
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${user.name}'s Profile`)
                    .setDescription(`Points: ${userPoints}`)
                    .setThumbnail(profilePicture)
                    .addFields(
                        { name: 'Ranks', value: userRanks.length > 0 ? `:medal: ${userRanks.join(', ')}` : ':medal: None', inline: false },
                    )
                    .setColor(color);

                // Show team leader status only if the user is a team leader
                if (userTeam !== ':shield: None') {
                    embed.addFields(
                        { name: 'Team Leader', value: `<@${userId}>`, inline: true },
                    );
                }

                // Show team status only if the user is in a team
                if (userTeam !== ':shield: None') {
                    embed.addFields(
                        { name: 'Team', value: userTeam, inline: false },
                    );
                }

                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error("Profile error: ", err);
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Profile Error')
                    .setDescription('There was an error fetching your profile. Please try again later.')
                    .setColor(0xFF0000);
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
}
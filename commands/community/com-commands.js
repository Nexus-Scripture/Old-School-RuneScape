const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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
                await executeLeaderboard(interaction);
            } catch (err) {
                console.error("Leaderboard error: ", err);
            }
        }
    },

    // //

    teamLeaderboard: {
        execute: async (interaction) => {
            try {
                const sortOption = interaction.options.getString('sort-by');
                let teams;
                if (sortOption === 'points') {
                    teams = await Teams.findAll({
                        where: { guildId: interaction.guild.id },
                        order: [['teamPoints', 'DESC']],
                        limit: 10
                    });
                } else if (sortOption === 'members') {
                    teams = await Teams.findAll({
                        where: { guildId: interaction.guild.id },
                        order: [['teamMembers', 'DESC']],
                        limit: 10
                    });
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle('Team Leaderboard')
                        .setDescription('Invalid sort option. Please choose "points" or "members".')
                        .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
                    return;
                }

                if (teams.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('Team Leaderboard')
                        .setDescription('No teams have earned any points yet.')
                        .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
                } else {
                    const teamsField = teams.map((team, index) => `${index + 1}. **${team.teamName}** - ${team.teamPoints}`).join('\n');
                    const embed = new EmbedBuilder()
                        .setTitle('Team Leaderboard')
                        .setDescription(teamsField)
                        .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
                }
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
                    return;
                }
    
                const perPage = 11; // Number of teams per page
    
                // Function to create the embed
                const createEmbed = (page) => {
                    const start = page * perPage; // Start index for teams
                    const end = start + perPage; // End index for teams
                    const teamFields = teams.slice(start, end).map((team, index) => {
                        const memberCount = team.teamMembers ? team.teamMembers.split(',').length : 0;
                        return {
                            name: team.teamName,
                            value: `Leader: <@${team.teamLeader}>\nMembers: ${memberCount}\nPoints: ${team.teamPoints}`,
                            inline: true
                        };
                    });
    
                    const embed = new EmbedBuilder()
                        .setTitle(`View Teams (Page ${page + 1})`)
                        .setColor(0x9B59B6);
                    
                    // Add fields to the embed
                    embed.addFields(
                        teamFields // Show all teams on the current page
                    );
                    
                    return embed;
                };
    
                // Create the initial embed
                const embed = createEmbed(0);
                
                // Create buttons for pagination
                const totalPages = Math.ceil(teams.length / perPage);
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true), // Disable if on the first page
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(totalPages <= 1) // Disable if there is only one page
                    );
    
                // Send the embed and buttons
                await interaction.reply({ embeds: [embed], components: [row] });
    
                // Create a collector for button interactions
                const filter = i => i.customId === 'prev' || i.customId === 'next';
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
    
                let currentPage = 0; // Track the current page
    
                collector.on('collect', async i => {
                    if (i.customId === 'next') {
                        currentPage++;
                    } else if (i.customId === 'prev') {
                        currentPage--;
                    }
    
                    // Update the embed and buttons
                    const newEmbed = createEmbed(currentPage);
                    const newRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === 0), // Disable if on the first page
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage >= totalPages - 1) // Disable if on the last page
                        );
    
                    await i.update({ embeds: [newEmbed], components: [newRow] });
                });
    
                collector.on('end', () => {
                    // Disable buttons after the collector ends
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                        );
                    interaction.editReply({ components: [disabledRow] });
                });
    
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
                        .setTitle(`🛡️ ${team.teamName}`)
                        .setDescription(team.teamDescription || 'No description available.')
                        .addFields(
                            { name: '👑 Team Leader', value: `<@${team.teamLeader}>`, inline: true },
                            { name: '⭐️ Team Points', value: team.teamPoints.toString(), inline: true },
                            { name: '👥 Team Members', value: teamMembersList, inline: false },
                        )
                        .setThumbnail(team.teamImage || null)
                        .setColor(0x9B59B6)
                        .setFooter({ text: `Team ID: ${team.teamId}`, iconURL: interaction.guild.iconURL() });
                    await interaction.reply({ embeds: [embed] });
                }
            } catch (err) { console.error("View team error: ", err); }
        }
    },

    // //

    viewRanks: {
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
                const targetUser = interaction.options.getUser('user') || interaction.user;
                const guildId = interaction.guild.id;
                const userId = targetUser.id;
                let userPoints, userTeam, userRoles, milestoneLevels, userRanks, profilePicture, leadingTeams;

                // Check if the user exists in the database
                let userExists = await User.findOne({ where: { userId, guildId } });
                if (!userExists) {
                    // If the user doesn't exist, create a new entry for them with default values
                    await User.create({
                        userId,
                        username: targetUser.tag,
                        guildId,
                        points: 0,
                        teamId: null,
                        days: 0,
                    });
                }

                // Fetch user data from the database
                userPoints = await User.findOne({ where: { userId, guildId } }).then(user => user.points).catch(console.error);
                userTeam = await Teams.findOne({ where: { teamLeader: userId } }).then(team => team ? team.teamName : 'None').catch(console.error);
                userRoles = interaction.member.roles.cache.map(role => role.id);
                milestoneLevels = await MilestoneLevels.findAll({ where: { guildId } });
                userRanks = await roleChecker(userRoles, milestoneLevels).catch(console.error);
                profilePicture = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });

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
                    .setTitle(`${targetUser.displayName}'s Profile 📜`)
                    .setThumbnail(profilePicture)
                    .setColor(color)
                    .addFields(
                        { 
                            name: 'Ranks 🏆', value: userRanks.length > 0 ? `:medal: ${userRanks.join(', ')}` : ':medal: None', inline: true,
                            name: 'Points 💰', value: `${userPoints}`, inline: true, 
                        },
                    );

                // Display team status only if the user is in a team
                if (userTeam !== 'None') {
                    embed.addFields(
                        { name: 'Team 🛡️', value: `${userTeam}`, inline: true },
                    );
                }

                // Display leading teams if the user is a team leader of any team
                if (leadingTeams.length > 0) {
                    embed.addFields(
                        { name: 'Leading Teams 👑', value: leadingTeams.join(', '), inline: false },
                    );
                }


                // Randomly select a tip for the footer
                const tips = [
                    '👥 Join a team to participate in team events and earn points together!',
                    '🎉 Participate in events and activities to earn points and climb the ranks!',
                    '🖼️ Profile looking a little empty? Try joining a team',
                    '🔍 Explore different roles to find the one that suits you best!',
                    '🏆 Show off your achievements by customizing your profile!',
                    '📈 Stay active and engaged to climb the ranks!',
                ];
                const randomTip = tips[Math.floor(Math.random() * tips.length)];
                embed.setFooter({ text: `Tip: ${randomTip}` });

                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error("Profile error: ", err);
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Profile Error 🚨')
                    .setDescription('There was an error fetching your profile. Please try again later.')
                    .setColor(0xFF0000);
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
}
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { User, Teams, MilestoneLevels } = require('../../model/model.js');

const { roleChecker } = require('../utils-functions/utils-handles.js');
const { executeLeaderboard } = require('../utils-functions/utils-leaderboards.js');

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
                    // const teamsField = teams.map((team, index) => `${index + 1}. **${team.teamName}** - ${team.teamPoints}`).join('\n');

                    const leaderboard = await Promise.all(teams.map(async team => {
                        return {
                            displayName: team ? team.teamName : "Unknown Team Name",
                            points: team.teamPoints
                        };
                    }));

                    const validLeaderboard = leaderboard.filter(team => team !== null); // Remove null entries
                    const teamsField = validLeaderboard.map((team, index) => {
                        let medal = ""; // Variable to hold the medal emoji
                        if (index === 0) {
                            medal = "🥇"; // Gold medal for 1st place
                        } else if (index === 1) {
                            medal = "🥈"; // Silver medal for 2nd place
                        } else if (index === 2) {
                            medal = "🥉"; // Bronze medal for 3rd place
                        } else {
                            medal = `${index + 1}. `; // No medal for others
                        }
                        return `${medal} **${team.displayName}** - ${team.points}`; // Append medal emoji
                    }).join('\n');
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
                        .setTitle('🚀 View Teams')
                        .setDescription('No teams found in the database.')
                        .setColor(0x9B59B6);
                    await interaction.reply({ embeds: [embed] });
                    return;
                }
    
                const perPage = 9; // Number of teams per page
    
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
                        .setTitle(`🚀 View Teams (Page ${page + 1})`)
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
                    const teamMembersList = teamMembers.length > 0 ? teamMembers.map(member => `- <@${member}>`).join('\n') : 'No Members Yet';
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
                const milestoneLevels = await MilestoneLevels.findAll({
                    where: { guildId: interaction.guild.id },
                    order: [['points', 'ASC']]
                });
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
                            {
                                name: `🔹 ${index + 1}. ${level.name}`,
                                value: `⭐️ Points: **${level.points}**\n🕒️ Duration: **${level.durationDays}** days\n💬 Description: *${level.description}*`, 
                                inline: true
                            }
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
                console.log("Executing profile command...");
                const targetUser = interaction.options.getUser('user') || interaction.user;
                console.log("Target User:", targetUser);
                const guildId = interaction.guild.id;
                console.log("Guild ID:", guildId);
                const userId = targetUser.id;
                console.log("User ID:", userId);
                let userPoints, userTeam, userRoles, milestoneLevels, userRanks, profilePicture, leadingTeams;

                // Check if the user exists in the database
                let userExists = await User.findOne({ where: { userId, guildId } });
                console.log("User Exists:", userExists);
                if (!userExists) {
                    console.log("User does not exist in the database. Creating new entry...");
                    // If the user doesn't exist, create a new entry for them with default values
                    await User.create({
                        userId,
                        username: targetUser.tag,
                        guildId,
                        points: 0,
                        teamId: null,
                        days: 0,
                    });
                    console.log("New user entry created.");
                }

                // Fetch user data from the database
                userPoints = await User.findOne({ where: { userId, guildId } }).then(user => user.points).catch(console.error);
                console.log("User Points:", userPoints);
                // //
                // Fetch the user's team based on teamId in the User table
                userTeam = await User.findOne({ 
                    where: { userId: userId }, // Assuming userId is available in your code
                    include: {
                        model: Teams,
                        as: 'team', // Use the correct alias if you defined associations with aliases
                        attributes: ['teamName'] // Only retrieve the team name
                    }
                }).then(user => user?.team ? user.team.teamName : 'None')
                .catch(console.error);
                console.log("User Team:", userTeam);
                // //
                userRoles = interaction.member.roles.cache.map(role => role.id);
                console.log("User Roles:", userRoles);
                // //
                userDays = await User.findOne({ where: { userId, guildId } }).then(user => user.days).catch(console.error);
                console.log("User Days:", userDays);
                // //
                milestoneLevels = await MilestoneLevels.findAll({ where: { guildId } });
                console.log("Milestone Levels:", milestoneLevels);
                // //
                userRanks = await User.findOne({ where: { userId, guildId } }).then(user => user.ranks ? user.ranks.split(',').map(rank => rank.trim()) : []).catch(console.error); 
                console.log("User Ranks:", userRanks);
                // //
                profilePicture = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
                console.log("Profile Picture:", profilePicture);

                // Fetch teams led by the user
                leadingTeams = await Teams.findAll({ where: { teamLeader: userId } }).then(teams => teams.map(team => team.teamName)).catch(console.error);
                console.log("Leading Teams:", leadingTeams);

                // Update colors based on points
                if (userPoints >= 10000) {
                    color = 0xff0000; // Red 
                } else if (userPoints >= 5000) {
                    color = 0x9900ff; // Purple 
                } else if (userPoints >= 1000) {
                    color = 0x00ff00; // Green 
                } else if (userPoints >= 500) {
                    color = 0xffff00; // Yellow 
                } else if (userPoints >= 100) {
                    color = 0x00ffff; // Cyan 
                } else {
                    color = 0x0000ff; // Blue 
                }
                console.log("Color:", color);

                const embed = new EmbedBuilder()
                    .setTitle(`${targetUser.displayName}'s Profile 📜`)
                    .setThumbnail(profilePicture)
                    .setColor(color)
                    .addFields(
                        { name: 'Points 💰', value: `${userPoints}`, inline: true, },
                        { name: 'Days 📅', value: `${userDays}`, inline: true, },
                    );

                // Display ranks only if the user has any ranks
                if (userRanks.length > 0) {
                    const rankValues = userRanks.map(rank => `<@&${rank}>`).join(', ');
                    embed.addFields(
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: 'Ranks 🏆', value: rankValues, inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                    );
                }

                // Display Days 


                // Display team status only if the user is in a team
                if (userTeam !== 'None') {
                    embed.addFields(
                        { name: 'Team 🛡️', value: `${userTeam}`, inline: true },
                    );
                }

                // Display leading teams if the user is a team leader of any team
                if (leadingTeams.length > 0) {
                    embed.addFields(
                        { name: 'Leading Teams 👑', value: leadingTeams.join(', '), inline: true },
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
    },

    // //

    help: {
        execute: async (interaction) => {
            try {
                const options = [
                    {
                        label: 'Admin Commands',
                        description: 'Commands for managing server settings',
                        value: 'admin_commands',
                    },
                    {
                        label: 'Community Commands',
                        description: 'Commands for community interactions',
                        value: 'community_commands',
                    },
                    {
                        label: 'Configuration Commands',
                        description: 'Commands for configuring the bot',
                        value: 'configuration_commands',
                    },
                    {
                        label: 'Help With Commands',
                        description: 'Help with commands for the bot',
                        value: 'command_help',
                    }
                ];
        
                // Check if the user is the owner and add the Owner Commands option
                if (interaction.member.id === process.env.OWNER) {
                    options.push({
                        label: 'Owner Commands',
                        description: 'Commands only available to the bot owner',
                        value: 'owner_commands',
                    });
                }
        
                // Create the select menu and action row
                const row = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('help_menu')
                            .setPlaceholder('Select a category')
                            .addOptions(options),
                    );
        
                // Create the initial embed
                const optionEmbed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("Help")
                    .setDescription("Choose an option below to see commands");
            
                // Reply with the embed and select menu
                await interaction.reply({ embeds: [optionEmbed], components: [row] });
            } catch (error) {
                console.error('An error occurred while creating the help embed:', error);
                interaction.reply({ content: 'An error occurred while generating the help message. Please contact the admin. **Error code: 0hb**', ephemeral: true });
            }
        }
    },

    // //

    joinTeam: {
        execute: async (interaction) => {
            console.log(`Attempting to join team for user ${interaction.user.id}`);
            const teamName = interaction.options.getString('team-name');
            
            try {
                // Check if the team exists
                const team = await Teams.findOne({ 
                    where: { 
                        teamName,
                        guildId: interaction.guild.id 
                    } 
                });
    
                if (!team) {
                    return interaction.reply({ 
                        content: `Team "${teamName}" does not exist.`, 
                        ephemeral: true 
                    });
                }
    
                // Check if the user is already in a team
                const user = await User.findOne({ 
                    where: { 
                        userId: interaction.user.id,
                        guildId: interaction.guild.id
                    } 
                });
    
                if (user?.teamId) {
                    return interaction.reply({ 
                        content: `You are already in a team. Please leave your current team first.`, 
                        ephemeral: true 
                    });
                }
    
                // Check if the team is full (optional - if you have a max team size)
                const teamMembers = team.teamMembers ? team.teamMembers.split(',') : [];
                const MAX_TEAM_SIZE = 10; // Set your desired max team size
                
                if (teamMembers.length >= MAX_TEAM_SIZE) {
                    return interaction.reply({ 
                        content: `Sorry, team "${teamName}" is full.`, 
                        ephemeral: true 
                    });
                }
    
                // Add user to team
                if (user) {
                    // Update existing user
                    await user.update({
                        teamId: team.teamId
                    });
                } else {
                    // Create new user entry
                    await User.create({
                        userId: interaction.user.id,
                        username: interaction.user.username,
                        guildId: interaction.guild.id,
                        teamId: team.teamId,
                        points: 0,
                        days: 0
                    });
                }
    
                // Update team members list
                if (!teamMembers.includes(interaction.user.id)) {
                    teamMembers.push(interaction.user.id);
                    await team.update({
                        teamMembers: teamMembers.join(','),
                        teamMemberCount: teamMembers.length // If you track member count
                    });
                }
    
                // Create success embed
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Team Joined Successfully')
                    .setDescription(`You have joined team "${teamName}"!`)
                    .setColor(0x00FF00)
                    .addFields(
                        {
                            name: 'Team',
                            value: teamName,
                            inline: true
                        },
                        {
                            name: 'Members',
                            value: `${teamMembers.length}`,
                            inline: true
                        },
                        {
                            name: 'Points',
                            value: `${team.teamPoints}`,
                            inline: true
                        }
                    )
                    .setTimestamp();
    
                // Optional: Log to a specific channel
                const logToChannel = Server.findOne({ where: { guildId: interaction.guild.id } });
                console.log(`Logging Channel Id: ${logToChannel.loggingChannelId}`);

                const logChannel = interaction.guild.channels.cache.get(logToChannel.loggingChannelId);
                if (logChannel) {
                    logChannel.send({
                        content: `${interaction.user.tag} joined team "${teamName}"`
                    }).catch(err => console.log('Could not log to channel'));
                }
    
                // Reply to the user
                await interaction.reply({ 
                    embeds: [successEmbed],
                    ephemeral: false // Set to true if you want only the user to see it
                });
    
            } catch (error) {
                console.error("Join team error:", error);
                
                // Create error embed
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error Joining Team')
                    .setDescription('There was an error while trying to join the team. Please try again later.')
                    .setColor(0xFF0000)
                    .setTimestamp();
    
                await interaction.reply({ 
                    embeds: [errorEmbed], 
                    ephemeral: true 
                });
            }
        }
    },

    leaveTeam: {
        execute: async (interaction) => {
            const teamName = interaction.options.getString('team-name');
    
            try {
                // Check if the team exists
                const team = await Teams.findOne({ where: { teamName } });
                if (!team) {
                    return interaction.reply({ content: `Team ${teamName} does not exist.`, ephemeral: true });
                }
    
                // Check if the user is in the team
                const user = await User.findOne({ where: { userId: interaction.user.id } });
                if (!user || user.teamId !== team.teamId) {
                    return interaction.reply({ content: `You are not a member of team ${teamName}.`, ephemeral: true });
                }
    
                // Remove the user from the teamMembers field
                const teamMembers = team.teamMembers ? team.teamMembers.split(',') : [];
                const userIndex = teamMembers.indexOf(interaction.user.id);
                if (userIndex > -1) {
                    teamMembers.splice(userIndex, 1); // Remove the user ID from the array
                    await team.update({
                        teamMembers: teamMembers.join(','), // Update the teamMembers field
                    });
                    console.log(`User  ${interaction.user.id} removed from team members list for team ${teamName}.`);
                }
    
                // Clear the teamId in the User table
                await user.update({ teamId: null });
                console.log(`User  ${interaction.user.id} has left team ${teamName}.`);
                
                // Send embed message
                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ Team Left Successfully")
                    .setDescription(`You have left team "${teamName}"!`)
                    .setColor(0xe47830)
                    .addFields(
                        {
                            name: 'Team',
                            value: teamName,
                            inline: true
                        },
                        {
                            name: 'Members',
                            value: `${teamMembers.length}`,
                            inline: true
                        },
                        {
                            name: 'Points',
                            value: `${team.teamPoints}`,
                            inline: true
                        }
                    )
                    .setTimestamp();
    
                await interaction.reply({ embeds: [successEmbed] });
            } catch (error) {
                console.error("Error leaving team:", error);
                await interaction.reply({ content: "There was an error leaving the team. Please try again later.", ephemeral: true });
            }
        },
    },
}
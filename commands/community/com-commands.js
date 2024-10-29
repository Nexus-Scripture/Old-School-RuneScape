const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
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
                            { 
                                name: `🔹 ${index + 1}. ${level.name}`, 
                                value: `⭐️ Points: ${level.points}\n🕒️ Duration: ${level.durationDays} days\n💬 Description: ${level.description}`, 
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
                userTeam = await Teams.findOne({ where: { teamLeader: userId } }).then(team => team ? team.teamName : 'None').catch(console.error);
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
            console.log(`Team name: ${teamName}`);
            const teamLeader = interaction.options.getUser ('team-leader');
            console.log(`Team leader: ${teamLeader ? teamLeader.tag : 'Not specified'}`);
    
            try {
                // Check if the team exists
                const team = await Teams.findOne({ where: { teamName } });
                console.log(`Team exists: ${team ? 'Yes' : 'No'}`);
                if (!team) {
                    console.error(`Team ${teamName} does not exist.`);
                    return interaction.reply({ content: `Team ${teamName} does not exist.`, ephemeral: true });
                }
    
                // Check if the user is already in a team
                const userTeam = await User.findOne({ where: { userId: interaction.user.id } });
                console.log(`User  is already in a team: ${userTeam ? 'Yes' : 'No'}`);
                if (userTeam && userTeam.teamId) {
                    console.error(`User  ${interaction.user.id} is already in a team.`);
                    return interaction.reply({ content: `You are already in a team.`, ephemeral: true });
                }
    
                // Check if the team leader is specified and if they are the actual leader of the team
                if (teamLeader) {
                    const teamLeaderId = team.leaderId;
                    console.log(`Team leader ID: ${teamLeaderId}`);
                    if (teamLeaderId !== teamLeader.id) {
                        console.error(`The specified user is not the leader of team ${teamName}.`);
                        return interaction.reply({ content: `The specified user is not the leader of team ${teamName}.`, ephemeral: true });
                    }
                }
    
                console.log(`Team ID: ${team.teamId}`);
    
                // Update user table with the teamId or insert with default data if user doesn't exist
                const existingUser  = await User.findOne({ where: { userId: interaction.user.id } });
                if (existingUser) {
                    await existingUser .update({
                        teamId: team.teamId,
                    });
                    console.log(`User  ${interaction.user.id} team ID updated.`);
                } else {
                    await User.create({
                        userId: interaction.user.id,
                        username: interaction.user.username,
                        guildId: interaction.guild.id,
                        teamId: team.teamId,
                        days: 0,
                    });
                    console.log(`User  ${interaction.user.id} added to team ${teamName}.`);
                }
    
                // Update the teamMembers field in the Teams table
                const teamMembers = team.teamMembers ? team.teamMembers.split(',') : [];
                if (!teamMembers.includes(interaction.user.id)) {
                    teamMembers.push(interaction.user.id);
                    await team.update({
                        teamMembers: teamMembers.join(','),
                    });
                    console.log(`User  ${interaction.user.id} added to team members list for team ${teamName}.`);
                }
    
                console.log(`User  ${interaction.user.id} has joined team ${teamName}`);
                await interaction.reply({ content: `You have joined team ${teamName}!` });
    
            } catch (error) {
                console.error("Database error:", error);
                await interaction.reply({ content: "There was an error joining the team. Please try again later.", ephemeral: true });
            }
        },
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
    
                await interaction.reply({ content: `You have left team ${teamName}!` });
            } catch (error) {
                console.error("Error leaving team:", error);
                await interaction.reply({ content: "There was an error leaving the team. Please try again later.", ephemeral: true });
            }
        },
    },
}
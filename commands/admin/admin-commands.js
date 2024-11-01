const { EmbedBuilder } = require("discord.js");
const { Teams, User, MilestoneLevels, Server } = require("../../model/model.js");
const { roleChecker } = require("../utils-functions/utils-handles.js");

module.exports = {
    addPoints: {
        execute: async (interaction) => {
            try {
                console.log("Executing addPoints command...");
                const points = interaction.options.getInteger("points");
                const userMention = interaction.options.getUser("user");
                const guildId = interaction.guild.id;
    
                if (!points) {
                    return interaction.reply({ content: "Please provide both points", ephemeral: true });
                }
    
                // Check if a team name is included
                const teamName = interaction.options.getString("team-name");
                if (teamName) {
                    const team = await Teams.findOne({ where: { teamName, guildId } });
                    if (!team) {
                        return interaction.reply({ content: "Team not found in the database.", ephemeral: true });
                    }
                    await team.increment("teamPoints", { by: points });
                    const embed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle("✨ Points Added to Team ✨")
                        .setDescription(`Successfully added ${points} points to the team ${teamName}.`)
                        .setTimestamp();
    
                    return interaction.reply({ embeds: [embed] });
                } else {
                    const userId = userMention.id;
                    let user = await User.findOne({ where: { userId, guildId } });
                    if (!user) {
                        const newUser = await User.create({
                            userId,
                            guildId,
                            username: userMention.username,
                            teamId: null,
                            points: 0,
                            days: 0
                        });
                        user = newUser;
                    }
        
                    await user.increment("points", { by: points });
        
                    // Fetch updated user data to ensure points are accurate
                    const updatedUser = await User.findOne({ where: { userId, guildId } });
                    const milestoneRanks = await MilestoneLevels.findAll({ where: { guildId } });
                    await interaction.deferReply(); // Defers the reply to give time for processing
        
                    const embed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle("✨ Points Added ✨")
                        .addFields(
                            {
                                name: "User",
                                value: `<@${userMention.id}>`,
                                inline: true,
                            },
                            {
                                name: "Points Added",
                                value: `+${points}`,
                                inline: true,
                            },
                            {
                                name: "Total Points",
                                value: `${updatedUser.points}`,
                                inline: true,
                            },
                            {
                                name: "Current Rank",
                                value: `${updatedUser.ranks ? `<@&${updatedUser.ranks}>` : "None"}`,
                                inline: false,
                            }
                        )
                        .setTimestamp();

                    // Determine the next rank and points required to reach it
                    const milestoneSorted = await MilestoneLevels.findAll({ where: { guildId }, order: [['points', 'ASC']] });
                    const nextRank = milestoneSorted.find(rank => updatedUser.points < rank.points);
                    if (nextRank) {
                        const pointsNeeded = nextRank.points - updatedUser.points;
                        const daysNeeded = nextRank.durationDays - updatedUser.days;
                        embed.addFields({
                            name: "To Reach Next Rank",
                            value: `**${nextRank.name}**\n${pointsNeeded} more points needed\n${daysNeeded} more days needed`,

                            inline: false,
                        });
                    } else {
                        embed.addFields({
                            name: "To Reach Next Rank",
                            value: "You have reached the highest rank!",
                            inline: false,
                        });
                    }
        
                    let rankUnlocked = false;
        
                    for (const rank of milestoneRanks) {
                        if (updatedUser.points >= rank.points) {
                            await interaction.guild.roles.fetch();
                            const role = interaction.guild.roles.cache.get(rank.roleId);
        
                            if (role) {
                                const member = await interaction.guild.members.fetch(userId);
                                if (!member.roles.cache.has(role.id)) {
                                    await member.roles.add(role);
                                    console.log(`Assigned role ${role.name} to ${userMention.displayName}`);
                                    await user.update({ ranks: role.id });
        
                                    embed.addFields({
                                        name: "🔓 Rank Unlocked",
                                        value: `Congratulations, ${userMention.displayName}! You have unlocked the rank **${rank.name}**.`,
                                    });
                                    rankUnlocked = true;
                                }
                            } else {
                                console.error(`Role with ID ${rank.roleId} not found.`);
                                return interaction.followUp({ content: "Role not found.", ephemeral: true });
                            }
                        }
                    }
                
                    await interaction.followUp({ embeds: [embed] });
                }
            } catch (error) {
                console.error("Error adding points:", error);
                if (!interaction.replied) {
                    await interaction.followUp({
                        content: "There was an error adding points. Please try again later.",
                        ephemeral: true,
                    });
                }
            }
        },
    },

    removePoints: {
        execute: async (interaction) => {
            try {
                const points = interaction.options.getInteger("points");
                const userMention = interaction.options.getUser("user");

                const teamName = interaction.options.getString("team-name");

                const guildId = interaction.guild.id;

                if (!points) {
                    return interaction.reply({
                        content: "Please provide both points",
                        ephemeral: true,
                    });
                }

                if (userMention) {
                    const userId = userMention.id;

                    const user = await User.findOne({ where: { userId, guildId } });
                    if (!user) {
                        return interaction.reply({
                            content: "User not found in the database.",
                            ephemeral: true,
                        });
                    }

                    // Ensure the user's points do not go below 0
                    const newPoints = Math.max(0, user.points - points);
                    await user.update({ points: newPoints });

                    const embed = new EmbedBuilder()
                        .setColor(0xffd900)
                        .setTitle("Points Removed 🚫")
                        .setDescription(`Successfully removed ${points} points from ${userMention.displayName}.`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });

                    // Check if the user needs to lose their rank
                    const currentRankId = user.rankId; // Assuming user.rankId holds the current rank ID
                    if (currentRankId) {
                        const rankRole = await interaction.guild.roles.fetch(currentRankId);
                        const requiredPoints = rankRole.requiredPoints; // Assuming the role has a property for required points

                        // Check if the user's points are below the required points for their current rank
                        if (user.points < requiredPoints) {
                            const member = await interaction.guild.members.fetch(userId);
                            await member.roles.remove(rankRole.id);
                            console.log(`User ${userMention.displayName} has been removed from the rank: ${rankRole.name}`);

                            // Update the user's rank in the database
                            await user.update({ rankId: null }); // Clear the rankId field

                            // Send an embed message to the user
                            const rankEmbed = new EmbedBuilder()
                                .setColor(0xffd900)
                                .setTitle("Rank Removed 🚫")
                                .setDescription(`You have been removed from the rank: ${rankRole.name} due to insufficient points.`)
                                .addFields(
                                    {
                                        name: "Rank Name",
                                        value: rankRole.name,
                                        inline: true,
                                    },
                                    {
                                        name: "Required Points",
                                        value: requiredPoints.toString(),
                                        inline: true,
                                    }
                                )
                                .setTimestamp();

                            await interaction.followUp({ embeds: [rankEmbed] });
                        }
                    }
                } else {
                    const team = await Teams.findOne({ where: { teamName, guildId } });

                    if (!team) {
                        return interaction.reply({
                            content: "User not found in the database.",
                            ephemeral: true,
                        });
                    }

                    // Ensure the user's points do not go below 0
                    const newPoints = Math.max(0, team.teamPoints - points);
                    await team.update({ teamPoints: newPoints });

                    const embed = new EmbedBuilder()
                        .setColor(0xffd900)
                        .setTitle("Points Removed 🚫")
                        .setDescription(`Successfully removed ${points} points from ${teamName}.`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                }

                
            } catch (error) {
                console.error("Error removing points:", error);
                await interaction.reply({
                    content: "There was an error removing points. Please try again later.",
                    ephemeral: true,
                });
            }
        },
    },

    // //

    announce: {
        execute: async (interaction) => {
            try {
                await interaction.deferReply();

                // Get Role for notification
                const roleId = interaction.options.getString("notify_role");
                const role = roleId || null;

                // Get options
                const title = interaction.options.getString("title") || null;
                const color =
                    interaction.options.getString("color") || "#ffffff";
                const footer = interaction.options.getString("footer") || null;
                const image = interaction.options.getString("image") || null;
                const channel =
                    interaction.options.getChannel("channel") ||
                    interaction.channel;
                const currentDate = new Date();
                const formattedDate = currentDate.toLocaleString();

                await interaction.editReply(
                    "Please enter the announcement details for the description in the chat"
                );

                const filter = (m) => m.author.id === interaction.user.id;
                const descriptionResponse =
                    await interaction.channel.awaitMessages({
                        filter,
                        max: 1,
                        time: 60000,
                        errors: ["time"],
                    });

                // check if description was entered. If not, return to the user "Nothing entered"
                if (!descriptionResponse.first()) {
                    return interaction.followUp({
                        content: "No description provided.",
                    });
                }

                const userDescription = descriptionResponse.first().content;

                const description =
                    userDescription === "=close" ? null : userDescription;

                // console log all values
                console.log("Announcement options:", {
                    title,
                    description,
                    color,
                    footer,
                    image,
                    channelId: channel.id,
                    roleId,
                    channelName: channel.name,
                    currentDate,
                    formattedDate,
                });

                // Create the embed
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setColor(color.startsWith("#") ? color.slice(1) : color);

                if (description) {
                    embed.setDescription(description);
                }
                if (footer) {
                    embed.setFooter({ text: `${footer} • ${formattedDate}` });
                } else {
                    embed.setFooter({ text: `${formattedDate}` });
                }
                if (image) embed.setImage(image);

                // Send the embed to the specified channel
                try {
                    if (role !== null) {
                        await channel.send({ content: role });
                        await channel.send({ embeds: [embed] });
                    } else {
                        await channel.send({ embeds: [embed] });
                    }
                    await interaction.followUp({
                        content: `Announcement sent to ${channel}`,
                        ephemeral: true,
                    });
                } catch (error) {
                    console.error("Error sending announcement:", error);
                    return await interaction.followUp({
                        content:
                            "Failed to send the announcement. Please check the provided details.",
                        ephemeral: true,
                    });
                }
            } catch (err) {
                console.error("Error in announcement command:", err);
                return await interaction.followUp({
                    content:
                        "An error occurred while processing your request. Please try again.",
                    ephemeral: true,
                });
            }
        },
    },

    forceJoin: {
        execute: async (interaction) => {
            console.log(`Attempting to join team for user ${interaction.user.id}`);
            const teamName = interaction.options.getString('team-name');
            const userMention = interaction.options.getUser('user');
            const userId = userMention.id;
            
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
                        userId: userId,
                        guildId: interaction.guild.id
                    } 
                });
    
                if (user?.teamId) {
                    return interaction.reply({ 
                        content: `User is already in a team. They need to leave before joining a new team.`,  
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
                        userId: userId,
                        username: interaction.user.username,
                        guildId: interaction.guild.id,
                        teamId: team.teamId,
                        points: 0,
                        days: 0
                    });
                }
    
                // Update team members list
                if (!teamMembers.includes(userId)) {
                    teamMembers.push(userId);
                    await team.update({
                        teamMembers: teamMembers.join(','),
                        teamMemberCount: teamMembers.length // If you track member count
                    });
                }
    
                // Create success embed
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Team Joined Successfully')
                    .setDescription(`Admin Forced <@${userId}> have joined team "${teamName}"!`)
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
                const logToChannel = Server.findOne({ where: { serverId: interaction.guild.id } });
                const logChannelId = logToChannel.loggingChannelId;
                console.log(`Logging Channel Id: ${logChannelId}`);

                const logChannel = logChannelId;
                if (logChannel) {
                    logChannel.send({
                        content: `${interaction.user.username} joined team "${teamName}"`
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

    forceLeave: {
        execute: async (interaction) => {
            const teamName = interaction.options.getString('team-name');
            const userMention = interaction.options.getUser('user');
            const userId = userMention.id;
    
            try {
                // Check if the team exists
                const team = await Teams.findOne({ where: { teamName } });
                if (!team) {
                    return interaction.reply({ content: `Team ${teamName} does not exist.`, ephemeral: true });
                }
    
                // Check if the user is in the team
                const user = await User.findOne({ where: { userId: userId } });
                if (!user || user.teamId !== team.teamId) {
                    return interaction.reply({ content: `You are not a member of team ${teamName}.`, ephemeral: true });
                }
    
                // Remove the user from the teamMembers field
                const teamMembers = team.teamMembers ? team.teamMembers.split(',') : [];
                const userIndex = teamMembers.indexOf(userId);
                if (userIndex > -1) {
                    teamMembers.splice(userIndex, 1); // Remove the user ID from the array
                    await team.update({
                        teamMembers: teamMembers.join(','), // Update the teamMembers field
                    });
                    console.log(`User ${userId} removed from team members list for team ${teamName}.`);
                }
    
                // Clear the teamId in the User table
                await user.update({ teamId: null });
                console.log(`User  ${userId} has left team ${teamName}.`);

                // Optional: Log to a specific channel
                const logToChannel = Server.findOne({ where: { serverId: interaction.guild.id } });
                const logChannelId = logToChannel.loggingChannelId;
                console.log(`Logging Channel Id: ${logChannelId}`);

                const logChannel = logChannelId;
                if (logChannel) {
                    logChannel.send({
                        content: `${interaction.user.username} joined team "${teamName}"`
                    }).catch(err => console.log('Could not log to channel'));
                }
                
                // Send embed message
                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ Team Left Successfully")
                    .setDescription(`Admin forced <@${userId}> to leave team "${teamName}"!`)
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
        }
    }
};

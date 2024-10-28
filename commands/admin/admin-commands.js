const { EmbedBuilder } = require("discord.js");
const { Teams, User, MilestoneLevels } = require("../../model/model.js");
const { roleChecker } = require("../utils-functions/utils-handles.js");

module.exports = {
    addPoints: {
        execute: async (interaction) => {
            try {
                console.log("Executing addPoints command...");
                const points = interaction.options.getInteger("points");
                console.log("Points:", points);
                const userMention = interaction.options.getUser ("user");
                console.log("User  Mention:", userMention);
                const userId = userMention.id;
                console.log("User  ID:", userId);
    
                const guildId = interaction.guild.id;
                console.log("Guild ID:", guildId);
    
                if (!points || !userId) {
                    console.log("Points or User ID not provided.");
                    return interaction.reply({
                        content: "Please provide both points and user ID.",
                        ephemeral: true,
                    });
                }
    
                const user = await User.findOne({ where: { userId, guildId } });
                console.log("User :", user);
                if (!user) {
                    console.log("User not found in the database.");
                    return interaction.reply({
                        content: "User not found in the database.",
                        ephemeral: true,
                    });
                }
    
                // Check if a team name is included
                const teamName = interaction.options.getString("team-name");
                console.log("Team Name:", teamName);
                if (teamName) {
                    const team = await Teams.findOne({
                        where: { teamName, guildId },
                    });
                    console.log("Team:", team);
                    if (!team) {
                        console.log("Team not found in the database.");
                        return interaction.reply({
                            content: "Team not found in the database.",
                            ephemeral: true,
                        });
                    }
                    // Add points to the team instead of the user
                    await team.increment("teamPoints", { by: points });
                    const embed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle("Points Added to Team ✨")
                        .setDescription(
                            `Successfully added ${points} points to the team ${teamName}.`
                        )
                        .setTimestamp();
    
                    return await interaction.reply({ embeds: [embed] }); // Return here
                } else {
                    await user.increment("points", { by: points });

                    await interaction.deferReply();
                    
                    // Check if user meets a milestone rank
                    const milestoneRanks = await MilestoneLevels.findAll({
                        where: { guildId },
                    });
                    
                    for (const rank of milestoneRanks) {
                        console.log(`User Points: ${user.points}`);
                        console.log(
                            "Milestone Ranks:",
                            milestoneRanks.map(
                                (rank) => `Rank: ${rank.name}, Points: ${rank.points}`
                            )
                        );
                    
                        if (user.points >= rank.points) {
                            // Fetch roles to ensure they are cached
                            await interaction.guild.roles.fetch();
                    
                            const role = interaction.guild.roles.cache.find(
                                (role) => role.id === rank.roleId // Compare with role.id
                            );
                    
                            console.log("Role ID:", rank.roleId); // Log the role ID
                            console.log("Role:", role); // Log the found role
                    
                            if (role) {
                                try {
                                    // Get the member object for the user
                                    const member = await interaction.guild.members.fetch(userId);
                            
                                    // Create the embed for points added
                                    const embed = new EmbedBuilder()
                                        .setColor(0x00ff00)
                                        .setTitle("Points Added ✨")
                                        .setDescription(`Successfully added ${points} points to ${userMention.displayName}.`)
                                        .setTimestamp();
                            
                                    // Check if the member already has the role
                                    if (!member.roles.cache.has(role.id)) {
                                        await member.roles.add(role); // Use member.roles.add
                                        console.log(`Assigned role ${role.name} to ${userMention.displayName}`);
                                        console.log(`Inserting ${rank.id} into database`);
                            
                                        await user.update({ ranks: role.id }, { where: { userId } });
                            
                                        // Add rank unlocked field to the embed
                                        embed.addFields({
                                            name: "Rank Unlocked 🔓",
                                            value: `Congratulations, ${userMention.displayName}! You have unlocked the rank **${rank.name}**.`,
                                        });
                                    }
                            
                                    // Send the combined embed
                                    await interaction.followUp({ embeds: [embed] });
                            
                                } catch (error) {
                                    console.error("Failed to assign role:", error);
                                    await interaction.followUp({ content: "There was an error assigning the role.", ephemeral: true });
                                }
                            } else {
                                console.error(`Role with ID ${rank.roleId} not found.`);
                                await interaction.reply({ content: "Role not found.", ephemeral: true });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error adding points:", error);
                await interaction.reply({
                    content: "There was an error adding points. Please try again later.",
                    ephemeral: true,
                });
            }
        },
    },

    removePoints: {
        execute: async (interaction) => {
            try {
                const points = interaction.options.getInteger("points");
                const userMention = interaction.options.getUser("user");
                const userId = userMention.id;
                const guildId = interaction.guild.id;

                if (!points || !userId) {
                    return interaction.reply({
                        content: "Please provide both points and user ID.",
                        ephemeral: true,
                    });
                }

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
                const thumbnail = interaction.user.displayAvatarURL({
                    dynamic: true,
                    size: 1024,
                });
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
                    thumbnail,
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
                if (thumbnail) {
                    embed.setThumbnail(thumbnail);
                } else {
                    embed.setThumbnail(thumbnailUrl);
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
};

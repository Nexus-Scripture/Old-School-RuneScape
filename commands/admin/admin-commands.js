const { EmbedBuilder } = require('discord.js');
const { Teams, User, MilestoneLevels } = require('../../model/model.js');
const { roleChecker } = require('../utils-functions/utils-handles.js');



module.exports = {
    addPoints: {
        execute: async (interaction) => {
        try {
            console.log('Starting addPoints execution');
            const points = interaction.options.getInteger('points');
            const reason = interaction.options.getString('reason');

            const guildId = interaction.guild.id;

            if (!points) {
                console.log('Missing points');
                return interaction.reply({ content: 'Please provide points.', ephemeral: true });
            }

            let user, team;

            // Check if a user is mentioned
            const userMention = interaction.options.getUser('user');
            if (userMention) {
                console.log('User Mentioned');
                const userId = userMention.id;
                user = await User.findOne({ where: { userId, guildId } });
                if (!user) {
                    console.log('User not found in the database');
                    return interaction.reply({ content: 'User not found in the database.', ephemeral: true });
                }
            }

            // Check if a team name is included
            const teamName = interaction.options.getString('team-name');
            if (teamName) {
                console.log('Team Name Entered');
                team = await Teams.findOne({ where: { teamName, guildId } });
                if (!team) {
                    console.log('Team not found in the database');
                    return interaction.reply({ content: 'Team not found in the database.', ephemeral: true });
                }
            }

            // Add points to the team or user
            if (team) {
                await team.increment('teamPoints', { by: points });
                const embed = new EmbedBuilder()
                    .setColor(0xffd900)
                    .setTitle('Points Added to Team 🚀')
                    .setDescription(`Successfully added ${points} points to the team: ${teamName}.`)
                    .addFields(
                        { name: 'Points Received', value: `${points}`, inline: true },
                        { name: 'Reason', value: reason || 'Points added by an administrator.', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else if (user) {
                console.log('Add Points to User');
                
                const previousPoints = user.points;
                await user.increment('points', { by: points });

                // Check if the user has reached a rank set in the milestone table
                const milestoneLevels = await MilestoneLevels.findAll({ where: { guildId } });
                const userRanks = await roleChecker(interaction.member.roles.cache.map(role => role.id), milestoneLevels);
                if (userRanks.length > 0 && previousPoints < milestoneLevels[milestoneLevels.length - 1].points && user.points >= milestoneLevels[milestoneLevels.length - 1].points) {
                    await user.update({ ranks: userRanks.join(',') });
                }

                const embed = new EmbedBuilder()
                    .setColor(0xffd900)
                    .setTitle('Points Added 🎉')
                    .setDescription(`Successfully added ${points} points to ${user.displayName}.`)
                    .addFields(
                        { name: 'Points Received', value: `${points}`, inline: true },
                        { name: 'Reason', value: reason || 'Points added by a administrator', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error adding points:', error);
            await interaction.reply({ content: 'There was an error adding points. Please try again later.', ephemeral: true });
        }
        }
    },

    removePoints: {
        execute: async (interaction) => {
        try {
            const points = interaction.options.getInteger('points');
            const userMention = interaction.options.getUser('user');
            const userId = userMention.id;

            const guildId = interaction.guild.id;

            if (!points || !userId) {
                return interaction.reply({ content: 'Please provide both points and user ID.', ephemeral: true });
            }

            const user = await User.findOne({ where: { userId, guildId } });
            if (!user) {
                return interaction.reply({ content: 'User not found in the database.', ephemeral: true });
            }

            // Check if a team name is included
            const teamName = interaction.options.getString('team-name');
            if (teamName) {
                const team = await Teams.findOne({ where: { teamName, guildId } });
                if (!team) {
                    return interaction.reply({ content: 'Team not found in the database.', ephemeral: true });
                }
                // Remove points from the team instead of the user
                await team.decrement('teamPoints', { by: points });
                const embed = new EmbedBuilder()
                    .setColor(0xffd900)
                    .setTitle('Points Removed from Team 🚫')
                    .setDescription(`Successfully removed ${points} points from the team ${teamName}.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await user.decrement('points', { by: points });

                const embed = new EmbedBuilder()
                    .setColor(0xffd900)
                    .setTitle('Points Removed 🚫')
                    .setDescription(`Successfully removed ${points} points from the user with ID ${userId}.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error removing points:', error);
            await interaction.reply({ content: 'There was an error removing points. Please try again later.', ephemeral: true });
        }
        }
    },

    // //

    announce: {
        execute: async (interaction) => {
            try {
                await interaction.deferReply();
    
                // Get Role for notification
                const roleId = interaction.options.getString('notify_role');
                const role = roleId || null;
    
                // Get options
                const title = interaction.options.getString('title') || null;
                const color = interaction.options.getString('color') || '#ffffff';
                const footer = interaction.options.getString('footer') || null;
                const thumbnail = interaction.user.displayAvatarURL({ dynamic: true, size: 1024 });;
                const image = interaction.options.getString('image') || null;
                const channel = interaction.options.getChannel('channel') || interaction.channel;
                const currentDate = new Date();
                const formattedDate = currentDate.toLocaleString();
    
                await interaction.editReply('Please enter the announcement details for the description in the chat');
    
                const filter = m => m.author.id === interaction.user.id;
                const descriptionResponse = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
    
                // check if description was entered. If not, return to the user "Nothing entered"
                if (!descriptionResponse.first()) {
                    return interaction.followUp({ content: 'No description provided.' });
                }
    
                const userDescription = descriptionResponse.first().content;
    
                const description = userDescription === '=close' ? null : userDescription;
    
                // console log all values
                console.log('Announcement options:', {
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
                    formattedDate
                });
        
                // Create the embed
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setColor(color.startsWith('#') ? color.slice(1) : color);
        
                if (description) { embed.setDescription(description); }
                if (footer) { embed.setFooter({ text: `${footer} • ${formattedDate}` }); } else { embed.setFooter({ text: `${formattedDate}` }); }
                if (thumbnail) { embed.setThumbnail(thumbnail); } else { embed.setThumbnail(thumbnailUrl); }
                if (image) embed.setImage(image);
        
                // Send the embed to the specified channel
                try {
                    if (role !== null) {
                        await channel.send({ content: role });
                        await channel.send({ embeds: [embed] });
                    } 
                    else { await channel.send({ embeds: [embed] }); }
                    await interaction.followUp({ content: `Announcement sent to ${channel}`, ephemeral: true });
                } catch (error) {
                    console.error('Error sending announcement:', error);
                    return await interaction.followUp({ content: 'Failed to send the announcement. Please check the provided details.', ephemeral: true });
                }
            } catch (err) {
                console.error('Error in announcement command:', err);
                return await interaction.followUp({ content: 'An error occurred while processing your request. Please try again.', ephemeral: true });
            }
        }
    },
}
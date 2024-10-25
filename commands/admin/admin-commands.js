const { EmbedBuilder } = require('discord.js');
const { Teams, User } = require('../../model/model.js');

module.exports = {
    addPoints: {
        execute: async (interaction) => {
        try {
            const points = interaction.options.getInteger('points');
            const userMention = interaction.options.getString('user');
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
                // Add points to the team instead of the user
                await team.increment('teamPoints', { by: points });
                const embed = new EmbedBuilder()
                    .setColor(0xffd900)
                    .setTitle('Points Added to Team')
                    .setDescription(`Successfully added ${points} points to the team ${teamName}.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await user.increment('points', { by: points });

                const embed = new EmbedBuilder()
                    .setColor(0xffd900)
                    .setTitle('Points Added')
                    .setDescription(`Successfully added ${points} points to the user with ID ${userId}.`)
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
            const userMention = interaction.options.getString('user');
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
                    .setTitle('Points Removed from Team')
                    .setDescription(`Successfully removed ${points} points from the team ${teamName}.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await user.decrement('points', { by: points });

                const embed = new EmbedBuilder()
                    .setColor(0xffd900)
                    .setTitle('Points Removed')
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

    addTeams: {
        execute: async (interaction) => {
            const teamName = interaction.options.getString('team-name');
            const teamDesc = interaction.options.getString('team-description');
            const ownerMention = interaction.options.getUser('team-leader');
            const ownerId = ownerMention.id;
            const teamImage = interaction.options.getString('team-image');

            try {
                // Check if the team already exists
                const existingTeam = await Teams.findOne({ where: { teamName } });
                if (existingTeam) {
                    const embed = new EmbedBuilder()
                        .setTitle('Error Adding Team')
                        .setDescription('A team with that name already exists.')
                        .setColor(0xFF0000);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Add the team to the database
                await Teams.create({
                    guildId: interaction.guild.id,
                    teamName,
                    teamDescription: teamDesc,
                    teamPoints: 0,
                    teamLeader: ownerId,
                    teamImage
                });

                const embed = new EmbedBuilder()
                    .setTitle('Team Added')
                    .setDescription(`Team ${teamName} has been added.`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error adding team to database:', error);
                const embed = new EmbedBuilder()
                    .setTitle('Error Adding Team')
                    .setDescription('There was an error adding the team.')
                    .setColor(0xFF0000);
                interaction.reply({ embeds: [embed], ephemeral: true });
            }


        }
    },

    removeTeams: {
        execute: async (interaction) => {
            const teamName = interaction.options.getString('team-name');

            try {
                // Check if the team exists
                const existingTeam = await Teams.findOne({ where: { teamName } });
                if (!existingTeam) {
                    const embed = new EmbedBuilder()
                        .setTitle('Error Removing Team')
                        .setDescription('A team with that name does not exist.')
                        .setColor(0xFF0000);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Remove the team from the database
                await Teams.destroy({ where: { teamName } });

                // Remove all users in that team from the team
                await User.update({ teamName: null }, { where: { teamName } });

                const embed = new EmbedBuilder()
                    .setTitle('Team Removed')
                    .setDescription(`Team ${teamName} has been removed.`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error removing team from database:', error);
                const embed = new EmbedBuilder()
                    .setTitle('Error Removing Team')
                    .setDescription('There was an error removing the team.')
                    .setColor(0xFF0000);
                interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },

    editTeams: {
        execute: async (interaction) => {
            console.log('Edit team command executed');

            const teamName = interaction.options.getString('team-name');
            const newTeamName = interaction.options.getString('new-team-name') || teamName; // Include new team name
            const teamLeader = interaction.options.getUser('team-leader') || null;
            const teamDescription = interaction.options.getString('team-description');
            const teamImage = interaction.options.getString('team-image');

            console.log(`Attempting to edit team: ${teamName}, with leader: ${teamLeader?.username}, description: ${teamDescription}, and image: ${teamImage}, to new name: ${newTeamName}`);

            // Check if no information is provided to edit the team
            if (!teamLeader && !teamDescription && !teamImage && teamName === newTeamName) {
                console.log('No information provided to edit the team.');
                const embed = new EmbedBuilder()
                    .setTitle('Error Editing Team')
                    .setDescription('Please include information to edit the team.')
                    .setColor(0xFF0000);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            try {
                console.log('Deferring reply...');
                await interaction.deferReply();

                // Check if the team exists
                console.log(`Checking if team ${teamName} exists...`);
                const existingTeam = await Teams.findOne({ where: { teamName } });
                if (!existingTeam) {
                    console.log(`Team ${teamName} does not exist.`);
                    const embed = new EmbedBuilder()
                        .setTitle('Error Editing Team')
                        .setDescription('A team with that name does not exist.')
                        .setColor(0xFF0000);
                    return interaction.editReply({ embeds: [embed], ephemeral: true });
                }

                console.log(`Team ${teamName} exists. Proceeding with edit...`);

                // Prepare update options
                const updateOptions = {};

                // Update team details first
                if (teamDescription) {
                    updateOptions.teamDescription = teamDescription;
                }
                if (teamImage) {
                    updateOptions.teamImage = teamImage;
                }
                if (newTeamName !== teamName) { // Check if new team name is different
                    updateOptions.teamName = newTeamName;
                }

                // Update team details
                console.log('Updating team details...');
                await Teams.update(updateOptions, { where: { teamName } });

                // Check if the team leader is changed
                if (teamLeader && (existingTeam.teamLeader !== teamLeader.id || process.env.BOT_OWNER || process.env.COMISSIONER)) {
                    console.log(`Team leader change detected for team ${teamName}.`);
                    // Debug for team leader ID
                    console.log(`Current team leader ID: ${existingTeam.teamLeader}, New team leader ID: ${teamLeader.id}`);
                    // Prompt the previous team leader to confirm the transfer
                    const confirmEmbed = new EmbedBuilder()
                        .setTitle('**Confirm Team Leadership Transfer**')
                        .setDescription(`Do you want to transfer the leadership of team ${teamName} to ${teamLeader.username}?`)
                        .setColor(0xFFFF00);
                    console.log('Sending confirmation prompt...');
                    await interaction.editReply({ embeds: [confirmEmbed] });

                    // Wait for the previous team leader to confirm
                    console.log('Waiting for confirmation...');
                    const filter = m => true;
                    const confirmResponse = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => {
                        console.log('Time has run out for leadership transfer confirmation.');
                        return interaction.followUp({ content: 'Time has run out for leadership transfer confirmation.' });
                    });

                    if (!confirmResponse.first() || confirmResponse.first().content.toLowerCase() !== 'yes') {
                        console.log('Leadership transfer cancelled.');
                        const cancelEmbed = new EmbedBuilder()
                            .setTitle('Leadership Transfer')
                            .setDescription('Leadership transfer cancelled.')
                            .setColor(0xFF0000);
                        return interaction.followUp({ embeds: [cancelEmbed] });
                    } else {
                        console.log('Leadership transfer confirmed.');
                        const confirmEmbed = new EmbedBuilder()
                            .setTitle('**Leadership Transfer**')
                            .setDescription('Leadership transfer confirmed.')
                            .setColor(0x00FF00);
                        return interaction.followUp({ embeds: [confirmEmbed] });
                    }
                } else if (!teamLeader) {
                    console.log('No team leader change detected.');
                }

                // Update team leader if necessary
                if (teamLeader) {
                    updateOptions.teamLeader = teamLeader.id;
                    console.log('Updating team leader...');
                    await Teams.update(updateOptions, { where: { teamName } });
                }

                console.log(`Team ${teamName} details updated.`);
                const embed = new EmbedBuilder()
                    .setTitle('Team Details Updated 📝')
                    .setDescription(`Details for team ${teamName} have been updated.`)
                    .setColor(0x00FF00);

                // Show what was edited to the user in fields
                let fields = [];
                if (teamLeader) {
                    fields.push({ name: '👑 Team Leader', value: teamLeader.username, inline: false });
                }
                if (teamDescription) {
                    fields.push({ name: '📄 Team Description', value: teamDescription, inline: false });
                }
                if (teamImage) {
                    fields.push({ name: '📸 Team Image', value: teamImage, inline: false });
                }
                if (newTeamName !== teamName) { // Check if new team name is different
                    fields.push({ name: '🔄 Team Name', value: newTeamName, inline: false });
                }
                embed.addFields(fields);

                console.log('Sending updated team details...');
                interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Error updating team details:', error);
                const embed = new EmbedBuilder()
                    .setTitle('Error Editing Team')
                    .setDescription('There was an error updating the team details.')
                    .setColor(0xFF0000);
                interaction.reply({ embeds: [embed], ephemeral: true });
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
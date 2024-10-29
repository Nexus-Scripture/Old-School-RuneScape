const { EmbedBuilder, TeamMember } = require('discord.js');
const { Teams, User, MilestoneLevels, Server } = require('../../../model/model');

module.exports = {
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

                // Generate a unique team ID
                const uniqueTeamId = Math.random().toString(36).substr(2, 9);

                // Add the team to the database with a unique team ID
                await Teams.create({
                    guildId: interaction.guild.id,
                    teamId: uniqueTeamId,
                    teamName,
                    teamDescription: teamDesc,
                    teamLeader: ownerId,
                    teamPoints: 0,
                    teamMembers: null,
                    teamImage,
                });

                const embed = new EmbedBuilder()
                    .setTitle('Team Added')
                    .setDescription(`Team ${teamName} has been added with ID: ${uniqueTeamId}.`)
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
                        .setDescription(`Do you want to transfer the leadership of team ${teamName} to ${teamLeader.username}?\n\nSay "yes" to confirm or "no" to cancel`)
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
                        await interaction.followUp({ embeds: [confirmEmbed] });

                        // Update team leader after confirmation
                        updateOptions.teamLeader = teamLeader.id;
                        console.log('Updating team leader...');
                        await Teams.update(updateOptions, { where: { teamName } });

                        // Send team details updated message after new leader has been set
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
                        await interaction.followUp({ embeds: [embed] });
                    }
                } else if (!teamLeader) {
                    console.log('No team leader change detected.');
                    // Send team details updated message without new leader
                    console.log(`Team ${teamName} details updated.`);
                    const embed = new EmbedBuilder()
                        .setTitle('Team Details Updated 📝')
                        .setDescription(`Details for team ${teamName} have been updated.`)
                        .setColor(0x00FF00);

                    // Show what was edited to the user in fields
                    let fields = [];
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
                    await interaction.followUp({ embeds: [embed] });
                }
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

    addRank: {
        execute: async (interaction) => {
            try {
                console.log('Executing addRank command...');
                const name = interaction.options.getString('role-name');
                const rankPoints = interaction.options.getInteger('required-points');
                const rankDescription = interaction.options.getString('description');
                const durationDays = interaction.options.getInteger('required-days');

                console.log('Checking command options...');
                if (!name || !rankPoints || !durationDays) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Error Adding Rank')
                        .setDescription('Please provide rank name, points, and duration days.')
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                console.log('Getting guild ID...');
                const guildId = interaction.guild.id;

                console.log('Checking if role exists...');
                let role = interaction.guild.roles.cache.find(role => role.name === name);
                if (!role) {
                    console.log('Creating new role...');
                    role = await interaction.guild.roles.create({
                        name
                    });
                }

                console.log('Checking if rank already exists...');
                const existingRank = await MilestoneLevels.findOne({ where: { name, guildId } });
                if (existingRank) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Error Adding Rank')
                        .setDescription('Rank already exists in the database.')
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                console.log('Adding new rank to database...');
                await MilestoneLevels.create({
                    guildId,
                    name,
                    points: rankPoints,
                    durationDays: durationDays,
                    description: rankDescription,
                    roleId: role ? role.id : null
                });

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Rank Added ✅')
                    .setDescription(`Successfully added rank ${name} with ${rankPoints} points and ${durationDays} days duration.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error adding rank:', error);
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Error Adding Rank')
                    .setDescription('There was an error adding rank. Please try again later.')
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },

    removeRank: {
        execute: async (interaction) => {
            try {
                const rankName = interaction.options.getString('role-name');
                console.log(`Rank Name: ${rankName}`);

                if (!rankName) { return interaction.reply({ content: 'Please provide the rank name.', ephemeral: true }); }

                const guildId = interaction.guild.id;

                const existingRank = await MilestoneLevels.findOne({ where: { name: rankName, guildId } });
                console.log(`Existing Rank: ${existingRank}`);
                if (!existingRank) { return interaction.reply({ content: 'Rank not found in the database.', ephemoral: true }); }

                const role = interaction.guild.roles.cache.get(existingRank.roleId);
                console.log(`Role: ${role}`);
                if (role) { await role.delete(); }

                await existingRank.destroy();
                // Remove the rank from the user database
                await User.destroy({ where: { ranks: existingRank.roleId, guildId } }); 


                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Rank Removed ❌')
                    .setDescription(`Successfully removed rank ${rankName}.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error removing rank:', error);
                await interaction.reply({ content: 'There was an error removing rank. Please try again later.', ephemeral: true });
            }
        }
    },

    editRank: {
        execute: async (interaction) => {
            try {
                const rankName = interaction.options.getString('role-name');
                const newRankName = interaction.options.getString('new-role-name');
                const newRankPoints = interaction.options.getInteger('required-points');
                const newRankDays = interaction.options.getInteger('required-days');

                if (!rankName || (!newRankName && !newRankPoints && !newRankDays)) {

                    return interaction.reply({ content: 'Please provide the rank name and either the new rank name or the new rank points.', ephemeral: true });
                }

                const guildId = interaction.guild.id;

                const existingRank = await MilestoneLevels.findOne({ where: { rankName, guildId } });
                if (!existingRank) {
                    return interaction.reply({ content: 'Rank not found in the database.', ephemeral: true });
                }

                if (newRankName) { existingRank.rankName = newRankName; }
                if (newRankPoints) { existingRank.rankPoints = newRankPoints; }
                if (newRankDays) { existingRank.durationDays = newRankDays; }

                const role = interaction.guild.roles.cache.get(existingRank.roleId);
                if (role) { role.setName(newRankName); }

                await existingRank.save();

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Rank Edited ✅')
                    .setDescription(`Successfully edited rank ${rankName}`)
                    .setTimestamp();                

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error editing rank:', error);
                await interaction.reply({ content: 'There was an error editing rank. Please try again later.', ephemeral: true });
            }
        }
    },

    dailyRankUpChannel: {
        execute: async (interaction) => {
            try {
                const guildId = interaction.guild.id;
                const channel = interaction.options.getChannel('channel');
                const channelId = channel.id; // Get the channel ID directly
                console.log(`Channel: ${channelId}`);
    
                // Update the server settings to set the rankUpId to the new channel ID
                await Server.update({ rankUpChannelId: channelId }, { where: { serverId: guildId } });
    
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Daily Rank Up Channel Updated')
                    .setDescription(`<#${channel.id}> has been set as the daily rank up channel!`)
                    .setTimestamp();
    
                await interaction.reply({ embeds: [embed] });
    
            } catch (error) {
                console.error('Error setting daily rank up channel:', error);
                await interaction.reply({ content: 'There was an error setting the daily rank up channel. Please try again later.', ephemeral: true });
            }
        }
    }
}
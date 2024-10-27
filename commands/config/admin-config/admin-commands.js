const { EmbedBuilder } = require('discord.js');
const { Teams, User } = require('../../../model/model');

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
}
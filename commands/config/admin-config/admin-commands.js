module.exports = {
    addTeams: {
        execute: async (interaction) => {
            const teamName = interaction.options.getString('team-name');
            const teamMembers = interaction.options.getString('team-members').split(',');

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
                    teamMembers: teamMembers.map(member => member.trim()),
                    teamPoints: 0
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

    announce: {
        async execute(interaction) {
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
        }
    },
}
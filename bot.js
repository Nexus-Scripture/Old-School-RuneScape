const {
    Client,
    GatewayIntentBits,
    Events,
    Collection,
    REST,
    Routes,
    SlashCommandBuilder,
    InteractionType,
    ChannelType,
    PermissionsBitField,
    AuditLogEvent,
    EmbedBuilder,
    ActivityType,
} = require("discord.js");

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        'MESSAGE',
        'CHANNEL',
        'REACTION',
        'GUILD_MEMBER',
        'USER'
    ]
});

require('dotenv').config(); // * Keep me above REST
const rest = new REST({ version: '10' }).setToken(process.env.LIVE_TOKEN);

// //

// ! Load values from Database
const { User, Server, MilestoneLevels, Teams } = require ('./model/model.js');

// //

// ! Log Events Logic
const { processLogs } = require('./events/logEvents.js');

// //

// ! Import utils if needed
const { fetchTeamNames } = require('./commands/utils-functions/utils-handles.js');
const { updateUser_Days } = require('./commands/utils-functions/utils-dailyTicker.js');
// const {  } = require('./commands/utils-functions/utils-rank.js');
// const {  } = require('./commands/utils-functions/');

// //

// ! Load Commands
async function setupCommands() {
    const guilds = await client.guilds.fetch();

    const commands = [
        // //
        // ? Rank Commands
        /*
         * Author:
         * @JayNightmare
        */
        // //
        // TODO - Setup Rank
        // * Setup Ranks for server - Role Managers > to use this command
        new SlashCommandBuilder()
            .setName('add-rank')
            .setDescription('Setup Ranks for users')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
            .addStringOption(option =>
                option.setName('role-name')
                    .setDescription('Name of the role')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('required-points')
                    .setDescription('Points required for the role')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('required-days')
                    .setDescription('Days required for the role')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('description')
                    .setDescription('Description of the role')
                    .setRequired(true)),
    
        // * Remove Ranks from server - Role Managers > to use this command
        new SlashCommandBuilder()
            .setName('remove-rank')
            .setDescription('Remove a rank from the server')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
            .addStringOption(option =>
                option.setName('role-name')
                    .setDescription('Name of the role to remove')
                    .setRequired(true)),
    
        // * Edit Ranks from server - Role Managers > to use this command
        new SlashCommandBuilder()
            .setName('edit-rank')
            .setDescription('Edit a rank in the server')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
            .addStringOption(option =>
                option.setName('role-name')
                    .setDescription('Name of the role to edit')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('new-role-name')
                    .setDescription('New name of the role')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('required-points')
                    .setDescription('Points required for the role')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('required-days')
                    .setDescription('Days required for the role')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('description')
                    .setDescription('Description of the role')
                    .setRequired(false)),
    
        // //
        // TODO - Admin Type Commands
        new SlashCommandBuilder()
            .setName('announce')
            .setDescription('Create an announcement with a customizable embed.')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
            .addStringOption(option => 
                option.setName('title')
                    .setDescription('The title of the embed'))
            .addStringOption(option => 
                option.setName('color')
                    .setDescription('The color of the embed (hex code, e.g., #ff0000)'))
            .addStringOption(option => 
                option.setName('footer')
                    .setDescription('The footer text of the embed'))
            .addStringOption(option => 
                option.setName('image')
                    .setDescription('URL of the main image. Put .jpg if still image, .gif if animated, etc.)'))
            .addChannelOption(option => 
                option.setName('channel')
                    .setDescription('The channel to send the announcement to'))
            .addStringOption(option => 
                option.setName('notify_role')
                    .setDescription('The role to be notified when a new stream is detected')),
    
        // //
    
        // TODO - Point System
        // ! Add Points
        new SlashCommandBuilder()
            .setName('add-points')
            .setDescription('Add points to a user.')
            .addIntegerOption(option => 
                option.setName('points')
                    .setDescription('Number of points to add')
                    .setRequired(true))
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('User to add points to')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(false)
                    )
            .addStringOption(option =>
                option.setName('reason')
                    .setDescription('Reason for adding points')
                    .setRequired(false)),
        
        // ! Remove Points 
        new SlashCommandBuilder()
            .setName('remove-points')
            .setDescription('Remove points from a user.')
            .addIntegerOption(option => 
                option.setName('points')
                    .setDescription('Number of points to remove')
                    .setRequired(true))
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('User to remove points from')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('reason')
                    .setDescription('Reason for adding points')
                    .setRequired(false)),
    
        // //
    
        // TODO - Community - Comps
        // ! Leaderboard
        new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('Show the leaderboard'),
    
        // ! Team Leaderboard
        new SlashCommandBuilder()
            .setName('team-leaderboard')
            .setDescription('Show the team leaderboard')
            .addStringOption(option =>
                option.setName('sort-by')
                    .setDescription('Sort the leaderboard by')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Most Points', value: 'points' },
                        { name: 'Most Members', value: 'members' }
                    )),
    
        // //
    
        // TODO - Community - Info
        // ! View Rank - profile command basically
        new SlashCommandBuilder()
            .setName('profile')
            .setDescription('View your profile or another user\'s profile')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.VIEW_CHANNEL)
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('The user whose profile you want to view')
                    .setRequired(false)),
    
        // ! View Team
        new SlashCommandBuilder()
            .setName('view-team')
            .setDescription('View a team')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.VIEW_CHANNEL)
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(true)),
    
        new SlashCommandBuilder()
            .setName('view-teams')
            .setDescription('View all teams')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.VIEW_CHANNEL),
    
        // ! View Ranks
        new SlashCommandBuilder()
            .setName('view-ranks')
            .setDescription('View all ranks')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.VIEW_CHANNEL),
    
        // //
    
        // TODO - Team Related
        // ! Add Team
        new SlashCommandBuilder()
            .setName('add-team')
            .setDescription('Add a team')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(true))
            .addUserOption(option =>
                option.setName('team-leader')
                    .setDescription('The user whose profile you want to view')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('team-description')
                    .setDescription('Description of the team')
                    .setRequired(false))
            .addStringOption(option => 
                option.setName('team-image')
                    .setDescription('URL with image type (.gif, .jpg, .png, etc)')
                    .setRequired(false)),
            
    
        // ! Remove team
        new SlashCommandBuilder()
            .setName('remove-team')
            .setDescription('Remove a team')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(true)),
        
        // ! Edit team
        new SlashCommandBuilder()
            .setName('edit-team')
            .setDescription('Edit a team')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(true)
                    )
            .addStringOption(option =>
                option.setName('new-team-name')
                    .setDescription('New name of the team')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('team-description')
                    .setDescription('Description of the team')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('team-image')
                    .setDescription('URL with image type (.gif, .jpg, .png, etc)')
                    .setRequired(false))
            .addUserOption(option =>
                option.setName('team-leader')
                    .setDescription('The user whose profile you want to view')
                    .setRequired(false)),
        
        // //
    
        // !  Join team
        new SlashCommandBuilder()
            .setName('join-team')
            .setDescription('Join a team')
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team to join')
                    .setRequired(true)
                    )
            .addUserOption(option =>
                option.setName('team-leader')
                    .setDescription('The leader of the team')
                    .setRequired(false)),
        
        // ! Admin Force Join Team
        new SlashCommandBuilder()
            .setName('admin-force-join-team')
            .setDescription('Force a user to join a team')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(true))
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('The user to force join the team')
                    .setRequired(true)),
    
        // //
    
        //  ! Leave team
        new SlashCommandBuilder()
            .setName('leave-team')
            .setDescription('Leave a team')
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team to leave')
                    .setRequired(true)),
        
        // ! Admin Force Leave Team
        new SlashCommandBuilder()
            .setName('admin-force-leave-team')
            .setDescription('Force a user to leave a team')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(true))
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('The user to force leave the team')
                    .setRequired(true)),
        
        // ! Team Leader Kick Member
        new SlashCommandBuilder()
            .setName('team-leader-kick-member')
            .setDescription('Kick a member from a team')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
            .addStringOption(option =>
                option.setName('team-name')
                    .setDescription('Name of the team')
                    .setRequired(true))
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('The user to kick from the team')
                    .setRequired(true)),
    
        // //
    
        // ! Help
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Display help information for commands'),
    
        // //
    
        // ! Setup Rank Up Channel
        new SlashCommandBuilder()
            .setName('daily-rank-up-channel')
            .setDescription('Setup a channel for rank up notifications')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('The channel to send rank up notifications')
                .setRequired(true)),
    
        // ! Setup Log Channel
        new SlashCommandBuilder()
            .setName('log-channel')
            .setDescription('Setup a channel for log notifications')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('The channel to send log notifications')
                .setRequired(true)),
    ].map(command => command.toJSON());

    try {
        for (const guild of guilds.values()) {
            try {
                // Call the setup function
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, guild.id),
                    { body: commands },
                )
                // console.log(`Successfully registered commands for guild: ${guild.id}`);
            } catch (error) {
                console.error(`Error registering commands for guild: ${guild.id}`, error);
            }
        }
    } catch(err) {
        console.error("Error refreshing application commands:", err);
    }
}

// //

// ! Import command logic 
const adminCommands = require('./commands/admin/admin-commands.js');
const adminCongifCommands = require('./commands/config/admin-config/config-admin-commands.js')
const communityCommands = require('./commands/community/com-commands.js');
const helpMenuCommands = require('./commands/help/help-commands.js');
const logConfigCommands = require('./commands/config/log-config/config-logging-commands.js');

// //

// ! Once Client On = Prime Commands and Database verification
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        console.log('Started refreshing application (/) commands');

        client.user.setActivity('Old School RuneScape', { type: ActivityType.Playing });
        client.user.setStatus('dnd');

        // Fetch all guilds the bot is in
        const guilds = await client.guilds.fetch();

        for (const guild of guilds.values()) {
            try {
                // Check if the server already exists in the database
                const existingServer = await Server.findOne({ where: { serverId: guild.id } });
                
                // If the server already exists, skip creation
                if (existingServer) {
                    console.log(`Server "${guild.name}" already exists in the database.`);
                } else {
                    // Create default entries for the server
                    await Server.create({
                        serverId: guild.id,
                        serverName: guild.name,
                        textChannelId: null,
                        loggingChannelId: null,
                        welcomeChannelId: null,
                        rankUpChannelId: null,
                        logLevel: 'low',
                        mute_role_level_1_id: null,
                        mute_role_level_2_id: null
                    });
                }
            } catch (error) {
                console.error(`Error adding guild or users to database: ${guild.name} (${guild.id})`, error);
            }
        }

        // Register slash commands for each guild dynamically
        try {
            // Call the setup function
            await setupCommands();
        } catch (error) {
            console.error(`Error registering commands for guilds: `, error);
        }

        console.log('Successfully reloaded application (/) commands');
    } catch (error) {
        console.error('An error occurred during initialization:', error);
    }
});

client.on('ready', async () => {
    // Fetch all members from all guilds the bot is in
    const guilds = client.guilds.cache;
    
    for (const guild of guilds.values()) {
        try {
            // Fetch all members
            const members = await guild.members.fetch();

            const goonRole = guild.roles.cache.find(role => role.name === "Goon");

            if (!goonRole) {
                console.error(`The "Goon" role does not exist in guild: ${guild.name}. Please create it.`);
                continue; // Skip to the next guild if the role doesn't exist
            }

            for (const member of members.values()) {
                if (member.user.bot) {
                    console.log(`Skipping bot ${member.user.username}`);
                    continue; // Skip to the next member
                }

                // Check if the member is already in the database
                const existingUser  = await User.findOne({ where: { userId: member.id, guildId: guild.id } });
                
                if (!existingUser) {
                    // Add the member to the database
                    await User.create({
                        userId: member.id,
                        username: member.user.username,
                        guildId: guild.id,
                        days: 0,
                        points: 0,
                        joinDate: new Date(), // Set the join date to now or use the member's join date
                    });
                    console.log(`Added user ${member.user.username} to the database.`);
                }

                if (!member.roles.cache.has(goonRole.id)) {
                    // Add the "Goon" role to the member
                    await member.roles.add(goonRole);
                    console.log(`Assigned "Goon" role to ${member.user.username} in guild: ${guild.name}`);
                }
            }
        } catch (error) {
            console.error(`Error fetching members for guild ${guild.id}:`, error);
        }
    }
});

// //

// ! Bot Joins Server = Check if server ID match, if not leave.
client.on(Events.GuildCreate, async guild => {
    try {
        console.log(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

        const existingServer = await Server.findOne({ where: { serverId: guild.id } });
        if (existingServer != process.env.DEBUG_SERVER_ID || existingServer != process.env.SERVER_ID) {

            console.log(`Leaving guild: ${guild.name} (ID: ${guild.id})`);
            
            // Find a suitable channel to send the message
            const channel = guild.channels.cache.find(ch => 
                ch.type === ChannelType.GuildText && 
                ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages)
            );

            if (channel) {
                try {
                    await channel.send("I'm not authorized to join this server. Goodbye!");
                } catch (error) {
                    console.error("Failed to send message before leaving:", error);
                }
            }

            // Leave the guild
            return guild.leave();
        }
        else if (existingServer) {
            return console.log(`Server ${guild.name} already exists in database`);
        } else {
            await Server.create({
                serverId: guild.id,
                serverName: guild.name,
                textChannelId: null,
                loggingChannelId: null,
                rankUpChannelId: null,
                logLevel: 'low'
            });
        }

        console.log(`Default entries created for server ${guild.name} (ID: ${guild.id})`);
        const systemChannel = guild.systemChannel;
        if (systemChannel) {
            systemChannel.send("Hello! Thank you for inviting me! use `/help` to see what I can do!");
        }
    } catch (err) {
        console.error(`Error creating server entry for ${guild.name} (ID: ${guild.id})`, err);
    }
});

// ! Bot Leaves Server = Check if server ID is in databaes, delete if so.
client.on(Events.GuildDelete, async guild => {
    try {
        console.log(`Bot was removed from ${guild.name} (ID: ${guild.id})`);

        const existingServer = await Server.findOne({ where: { serverId: guild.id } });
        if (existingServer) {
            // Bulk delete all related data 
            await Promise.all([
                Server.destroy({ where: { serverId: guild.id } }),
                User.destroy({ where: { guildId: guild.id } }),
                MilestoneLevels.destroy({ where: { guildId: guild.id } }),
                Punishment.destroy({ where: { guildId: guild.id } })
            ]);

            console.log(`Removed data for guild: ${guild.name}`);
        } else {
            console.log('Server is not in database');
        }
    } catch (err) {
        console.error(`Error deleting server (${guild.name} | ${guild.id}) from database:`, err);
    }
});

// //

// ! Member Join = Check if user is in Database, if not: add
client.on(Events.GuildMemberAdd, async member => {
    if (member.user.bot) return;

    const server = await Server.findOne({ where: { serverId: member.guild.id } });
    if (!server) return;

    try {
        console.log(`${member.user.tag} has joined the server`);

        const existingUser = await User.findOne({ where: { userId: member.user.id, guildId: member.guild.id } });
        if (existingUser) {
            return console.log(`User ${member.user.tag} already exists in database`);
        } else {
            await User.create({
                userId: member.user.id,
                guildId: member.guild.id,
                username: member.user.tag,
            });
        }

        const goonRole = guild.roles.cache.find(role => role.name === "Goon");

        if (!member.roles.cache.has(goonRole.id)) {
            // Add the "Goon" role to the member
            await member.roles.add(goonRole);
            console.log(`Assigned "Goon" role to ${member.user.username}`);
        }

    } catch (err) {
        console.error(`Error adding user ${member.user.tag} to database`, err);
    }
});

// ! Member Leave = Check if user is in Database, if so: delete
client.on(Events.GuildMemberRemove, async member => {
    if (member.user.bot) return;

    const server = await Server.findOne({ where: { serverId: member.guild.id } });
    if (!server) return;

    try {
        console.log(`${member.user.displayName} (ID: ${member.user.id}) has left the server`);
    } catch (err) {
        console.error(`Error removing user ${member.user.displayName} (ID: ${member.user.id}) from database`, err);
    }
});

// //

// ! Bot interaction = Handle interaction
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand() && interaction.componentType !== 3) return;
    const { commandName } = interaction;

    // //

    fetchTeamNames();

    // //
    try {
        // ? Help Commands
        // * Help Menu
        if (commandName === 'help') { console.log(`help command ran`); await communityCommands.help.execute(interaction); }

        // //
        // ? Admin Commands
        // * Announcements
        if (commandName === 'add-points') { console.log(`add-points command ran`); await adminCommands.addPoints.execute(interaction); }
        if (commandName === 'remove-points') { console.log(`remove-points command ran`); await adminCommands.removePoints.execute(interaction); }
        if (commandName === 'announce') { console.log(`announce command ran`); await adminCommands.announce.execute(interaction); }

        // //

        // ? Config Commands
        // * Admin Configuration Commands - Setup, Edit, Remove Commands
        if (commandName === 'add-team') { console.log(`add-team command ran`); await adminCongifCommands.addTeams.execute(interaction); }
        if (commandName === 'remove-team') { console.log(`remove-team command ran`); await adminCongifCommands.removeTeams.execute(interaction); }
        if (commandName === 'edit-team') { console.log(`edit-team command ran`); await adminCongifCommands.editTeams.execute(interaction); }
        // //
        if (commandName === 'add-rank') { console.log(`add-rank command ran`); await adminCongifCommands.addRank.execute(interaction); }
        if (commandName === 'edit-rank') { console.log(`edit-rank command ran`); await adminCongifCommands.editRank.execute(interaction); }
        if (commandName === 'remove-rank') { console.log(`remove-rank command ran`); await adminCongifCommands.removeRank.execute(interaction); } 
        // //
        if (commandName === 'daily-rank-up-channel') { console.log(`daily-rank-up-channel`); await adminCongifCommands.dailyRankUpChannel.execute(interaction); }
        if (commandName === 'log-channel') {  console.log(`log-channel`); await adminCongifCommands.logChannel.execute(interaction); }

        // //

        // * Community Configuration Commands - Setup, Edit, Remove Commands
        // ! Add Commands Here

        // //

        // * Community Commands - Comps
        if (commandName === 'view-teams') { console.log(`view-teams command ran`); await communityCommands.viewTeams.execute(interaction); }
        if (commandName === 'view-team') { console.log(`view-team command ran`); await communityCommands.viewTeam.execute(interaction); }
        if (commandName === 'leaderboard') { console.log(`leaderboard command ran`); await communityCommands.leaderboard.execute(interaction); }
        if (commandName === 'team-leaderboard') { console.log(`team-leaderboard command ran`); await communityCommands.teamLeaderboard.execute(interaction); }
        if (commandName === 'team-points') { console.log(`team-points command ran`); await communityCommands.teamPoints.execute(interaction); }
        if (commandName === 'team-info') { console.log(`team-info command ran`); await communityCommands.teamInfo.execute(interaction); }

        // //

        // * Community Commands - Ranks
        if (commandName === 'profile') { console.log(`profile command ran`); await communityCommands.profile.execute(interaction); }
        if (commandName === 'view-ranks') { console.log(`view-ranks command ran`); await communityCommands.viewRanks.execute(interaction); }
        
        // //

        //  * Community Commands - Join, Leave Teams

        if (commandName === 'join-team') { console.log(`join-team command ran`); await communityCommands.joinTeam.execute(interaction); }
        if (commandName === 'leave-team') { console.log(`leave-team command ran`); await communityCommands.leaveTeam.execute(interaction); }
        // //
        if (commandName === 'admin-force-join-team') { console.log(`force-join command ran`); await adminCommands.forceJoin.execute(interaction); }
        if (commandName === 'admin-force-leave-team') { console.log(`force-leave command ran`); await adminCommands.forceLeave.execute(interaction); }
        if (commandName === 'team-leader-kick-member') { console.log(`team-leader-kick-member command ran`); await adminCommands.teamLeaderKickMember.execute(interaction); }

        // //

        // * Help Menu Interaction
        if (interaction.customId === 'help_menu') { await helpMenuCommands.help_menu_selected.execute(interaction) }
    } catch(err) {
        // Embed message saying error
        const errorEmbed = new EmbedBuilder()
            .setTitle('Error')
            .setDescription('An error occurred while executing your command. Please try again later.')
            .setColor(0xFF0000);
        await interaction.reply({ embeds: [errorEmbed] });
        console.error(`Error executing command ${commandName}:`, err);
    }
});

// //

const wholeFiveMins = 1000 * 60 * 5;
const wholeTenMins = 1000 * 60 * 10;
const wholeThirtyMins = wholeTenMins * 3;
// //
const wholeHour = 1000 * 60 * 60;
const wholeFiveHours = wholeHour * 5;
// //
const wholeDay = wholeHour * 24;
const wholeWeek = wholeDay * 7;
const wholeMonth = wholeWeek * 4;
const wholeYear = wholeMonth * 12;

// //

setInterval(() => processLogs(client), wholeFiveMins);
setInterval(() => updateUser_Days(client), wholeFiveHours);

// //

module.exports = { setupCommands };

// //

client.login(process.env.LIVE_TOKEN);
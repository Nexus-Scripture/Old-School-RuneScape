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
} = require("discord.js");

const { EmbedBuilder } = require('@discordjs/builders');

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
        'REACTION'
    ]
});

require('dotenv').config(); // * Keep me above REST
const rest = new REST({ version: '10' }).setToken(process.env.TEST_TOKEN);

// //

// ! Load values from Database
const { User, Punishment, Server, MilestoneLevels } = require ('./model/model.js');

// //

// ! Log Events Logic
const { logEvent, processLogs } = require('./events/logEvents.js');

// //

// ! Import utils if needed
const {  } = require('./commands/utils-functions/utils-handles.js');
const {  } = require('./commands/utils-functions/utils-rank.js');
// const {  } = require('./commands/utils-functions/');
// const {  } = require('./commands/utils-functions/');


// //

// ! Import command logic 
const adminCommands = require('./commands/admin/admin-commands.js');
const communityCommands = require('./commands/community/com-commands.js');
const helpMenuCommands = require('./commands/help/help-commands.js');
const configCommands = require('./commands/config/config-commands.js');

// //

// ! Load Commands
const commands = [
    // //
    // ? Rank Commands
    /* 
     * Author: 
     * @Jay 
    */
    // * Setup Ranks for server - Role Managers > to use this command
    new SlashCommandBuilder()
        .setName('setup-ranks')
        .setDescription('Setup Ranks for users')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
        .addStringOption(option =>
            option.setName('role-name')
                .setDescription('Name of the role')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('required-points')
                .setDescription('Points required for the role')
                .setRequired(true)).toJSON()
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

    // TODO - Point System
    // ! Add Points
    
    // ! Remove Points 

    // //

    // TODO - Community - Comps
    // ! Leaderboard

    // ! Team Leaderboard

    // ! Team Points

    // //

    // TODO - Community - Rank
    // ! View rank - profile command basically

    // //

    // TODO - Team Related
    // ! Add Team?

    // ! Remvoe team

    // //

].map(command => command.toJSON());

// // 

// ! Once Client On = Prime Commands and Database verification
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        console.log('Started refreshing application (/) commands');

        // Fetch all guilds the bot is in
        const guilds = await client.guilds.fetch();

        for (const guild of guilds.values()) {
            try {
                // Check if the server already exists in the database
                const existingServer = await Server.findOne({ where: { serverId: guild.id } });
                
                // If the server already exists, skip creation
                if (existingServer) {
                    console.log(`Server ${guild.name} already exists in the database.`);
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
                console.error(`Error adding guild to database: ${guild.name} (${guild.id})`, error);
            }
        }

        // Load reaction roles before registering slash commands
        await loadReactionRoles();
        const reactionRoleConfigurations = getReactionRoleConfigurations();
        console.log('Reaction role configurations loaded:', reactionRoleConfigurations);

        // List all reaction roles to the console
        for (const [guildId, configs] of reactionRoleConfigurations.entries()) {
            for (const config of configs) {
                try {
                    const guild = await client.guilds.fetch(guildId);
                    
                    console.log(`Fetching channel ID: ${config.channelId} for guild ${guild.name}`);
                    const channel = await guild.channels.fetch(config.channelId); // Explicitly fetch the channel
    
                    if (!channel) {
                        console.log(`Channel not found: ${config.channelId} in guild ${guild.name}`);
                        continue;
                    }
    
                    const message = await channel.messages.fetch(config.messageId);
    
                    // Iterate through the reactions on the message using a proper async loop
                    for (const reaction of message.reactions.cache.values()) {
                        const users = await reaction.users.fetch();
                        for (const user of users.values()) {
                            if (!user.bot) {
                                console.log(`Reaction found from user ${user.tag} on message ${message.id}`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error processing guild ${guildId} and config ${config}:`, error);
                }
            }
        }

        // Register slash commands for each guild dynamically
        for (const guild of guilds.values()) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, guild.id),
                    { body: commands }
                );
                console.log(`Successfully registered commands for guild: ${guild.id}`);
            } catch (error) {
                console.error(`Error registering commands for guild: ${guild.id}`, error);
            }
        }

        console.log('Successfully reloaded application (/) commands');
    } catch (error) {
        console.error('An error occurred during initialization:', error);
    }
});

// //

// ! Bot Joins Server = Check if server ID match, if not leave.
client.on(Events.GuildCreate, async guild => {
    try {
        console.log(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

        const existingServer = await Server.findOne({ where: { serverId: guild.id } });
        if (existingServer != process.env.SERVER_ID) {
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
            await sequelize.transaction(async (t) => {
                // Bulk delete all related data
                await Promise.all([
                    Server.destroy({ where: { serverId: guild.id }, transaction: t }),
                    User.destroy({ where: { guildId: guild.id }, transaction: t }),
                    MilestoneLevels.destroy({ where: { guildId: guild.id }, transaction: t }),
                    Punishment.destroy({ where: { guildId: guild.id }, transaction: t })
                ]);
            });

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
    const { commandName, options, guildId } = interaction;

    // * Help Menu
    if (commandName === 'help') { console.log(`help command ran`); await helpMenuCommands.help.execute(interaction); }
    // //
    // * Admin Commands
    // ! Add Commands Here
    // //
    // * Community Commands
    // ! Add Commands Here

    // //

    // * Config Commands
    // ! Add Commands Here
    // //
});

// //

setInterval(() => processLogs(client), 1000 * 60 * 5);  // * Process logs every 5 minutes
client.login(process.env.TEST_TOKEN);

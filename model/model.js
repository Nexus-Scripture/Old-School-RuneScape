const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

// User Model: Storing user information (for leveling and other features)
const User = sequelize.define('User', {
    userId: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    teamId: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: 'Teams', // References the Teams table
            key: 'teamId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL' // If a team is deleted, user’s teamId will be set to NULL
    },
    days: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    ranks: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    joinDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
});

// Define the Server model
const Server = sequelize.define('Server', {
    serverId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    serverName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    textChannelId: {
        type: DataTypes.STRING,
        allowNull: true 
    },
    loggingChannelId: {
        type: DataTypes.STRING,
        allowNull: true 
    },
    rankUpChannelId: {
        type: DataTypes.STRING,
        allowNull: true
    },    
    logLevel: {
        type: DataTypes.STRING, // This will store "low", "medium", or "high"
        defaultValue: 'low' // Default to low level logging
    },
});

const MilestoneLevels = sequelize.define('MilestoneLevels', {
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    durationDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    roleId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    // Composite unique constraint
    uniqueKeys: {
        actions_unique: {
            fields: ['guildId', 'name']
        }
    }
});

const Teams = sequelize.define('Teams', {
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    teamId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    teamName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    teamDescription: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    teamLeader: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    teamMembers: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    teamPoints: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    teamImage: {
        type: DataTypes.STRING,
        allowNull: true,
    }
});

// //

// Define Associations
User.belongsTo(Teams, { foreignKey: 'teamId', as: 'team' }); // User has an optional foreign key teamId in Teams
Teams.hasMany(User, { foreignKey: 'teamId', as: 'members' }); // Teams can have multiple Users

// //

// Syncing the models with the database
(async () => {
    try {
        await User.sync(); // Create the User table if it doesn't exist
        await Server.sync(); // Create the Server table if it doesn't exist
        await MilestoneLevels.sync(); // Create the MilestoneLevel table if it doesn't exist
        await Teams.sync(); // Create the Team table if it doesn't exist
        console.log('Database models synced successfully.');
    } catch (error) {
        console.error('Unable to sync models with the database:', error);
    }
})();

module.exports = { User, Server, MilestoneLevels, Teams };

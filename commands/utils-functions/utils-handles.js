const { SlashCommandBuilder } = require('discord.js');
const { User, Server, MilestoneLevels, Teams } = require ('../../model/model.js');

const roleChecker = async (userRoles, milestoneLevels) => {
    // Filter the milestone levels to only include the roles that the user has
    const matchedRoles = milestoneLevels.filter(level => userRoles.includes(level.roleId));
    // Return the names of the matched roles
    return matchedRoles.map(level => level.roleName);
}

// Fetch team names from the database
async function fetchTeamNames() {
    try {
        // Using the Teams model from your existing code
        const teams = await Teams.findAll({
            attributes: ['teamName']
        });
        
        // Map the results to an array of objects in the format Discord.js expects
        return teams.map(team => ({
            name: team.teamName,
            value: team.teamName
        }));
    } catch (error) {
        console.error('Error fetching team names:', error);
        return []; // Return empty array if there's an error
    }
}


module.exports = {
    roleChecker,
    fetchTeamNames
};

// utils/dailyTicker.js

const { User, MilestoneLevels } = require('../../model/model.js'); // Adjust the path as necessary
const { Op } = require('sequelize'); // Make sure to import Op if you're using Sequelize operators

const updateUser_Days = async (client) => { // Corrected function name
    try {
        console.log('Ticked users for daily milestone.');

        const users = await User.findAll(); // Fetch all users from the database

        for (const user of users) {
            const joinDate = new Date(user.joinDate); // Get the join date
            const currentDate = new Date(); // Get the current date

            // Calculate the difference in days
            const diffTime = Math.abs(currentDate - joinDate);
            // const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
            const diffDays = Math.floor(diffTime / 10000); // Convert to days


            // Update the user's days in the database if necessary
            if (diffDays > user.days) {
                await user.update({ days: diffDays });
                console.log(`Updated days for user ${user.userId} to ${diffDays}`);

                // Check if the user qualifies for a rank role
                await assignRankRole(user, diffDays, client);
            }
        }
    } catch (error) {
        console.error('Error updating user days:', error);
    }
};

// Function to assign rank role based on days
const assignRankRole = async (user, days, client) => {
    const rank = await MilestoneLevels.findOne({ where: { durationDays: { [Op.lte]: days } } });
    if (rank) {
        const guild = client.guilds.cache.get(user.guildId); // Get the guild
        const member = await guild.members.fetch(user.userId); // Fetch the member

        if (member) {
            const role = guild.roles.cache.get(rank.roleId);
            if (role && !member.roles.cache.has(role.id)) {
                await member.roles.add(role); // Assign the role
                console.log(`Assigned role ${role.name} to user ${user.userId}`);
            }
        }
    }
};

module.exports = { updateUser_Days };
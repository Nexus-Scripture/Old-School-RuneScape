const roleChecker = async (userRoles, milestoneLevels) => {
    // Filter the milestone levels to only include the roles that the user has
    const matchedRoles = milestoneLevels.filter(level => userRoles.includes(level.roleId));
    // Return the names of the matched roles
    return matchedRoles.map(level => level.roleName);
}

module.exports = { roleChecker };



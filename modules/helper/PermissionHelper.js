class PermissionHelper {
    /**
         * Get the font-awesome icon used to display the permission level.
         * @private
         */
    static _getPermissionIcon(level) {
        const icons = {
            0: '<i class="far fa-circle"></i>',
            2: '<i class="fas fa-eye"></i>',
            3: '<i class="fas fa-check"></i>',
            999: '<i class="fas fa-users"></i>'
        };
        return icons[level];
    }

    /* -------------------------------------------- */

    /**
     * Get the font-awesome icon used to display the permission level.
     * @private
     */
    static _getPermissionDescription(level) {
        const description = {
            0: "None (cannot access sheet)",
            2: "Observer (access to sheet but can only purchase items if merchant sheet type)",
            3: "Owner (can access items and share coins)",
            999: "Change all permissions"
        };
        return description[level];
    }

    /**
    * @returns {User|null} GM user or null
    */
    static getTargetGM() {
        let targetGM = null;
        game.users.forEach((u) => {
            if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
                targetGM = u;
            }
        });

        return targetGM;
    }

    /**
     * 
     * @param {ActorData} actorData A token actor sheets actorData 
     * @param {number} playerId 
     * @param {number} newLevel 
     * @param {event} event
     * 
     * uses PermissionControl 
     */
    static _updatePermissions(actorData, playerId, newLevel, event) {
        // Read player permission on this actor and adjust to new level
        let currentPermissions = duplicate(actorData.permission);
        currentPermissions[playerId] = newLevel;
        // Save updated player permissions
        const lootPermissions = new PermissionControl(actorData.actor);
        lootPermissions._updateObject(event, currentPermissions);
    }

    // Update permissions to observer level, so players can loot
    /**
     * 
     * @param {Token5e} token
     * @param {Array<User>}
     * 
     * @returns {Array<object>}
     */
    static _updatedUserPermissions(token, lootingUsers = PermissionHelper.getPlayers()) {
        let permissions = {};
        Object.assign(permissions, token.actor.data.permission);

        lootingUsers.forEach((user) => {
            permissions[user.data._id] = CONST.ENTITY_PERMISSIONS.OBSERVER;
        });

        return permissions;
    }

    /**
     * Return the players current permissions or the sheets default permissions
     *  
     * @param {Actor5e<data>} actorData 
     * @param {user} player 
     * @returns {number} Permission Enum value
     */
     static getLootPermissionForPlayer(actorData, player) {
        let defaultPermission = actorData.permission.default;
        if (player.data._id in actorData.permission) {
            return actorData.permission[player.data._id];
        } else if (typeof defaultPermission !== "undefined") {
            return defaultPermission;
        } 
        
        return 0;
    }

    /**
     * @return {Array<User>}
     */
    static getPlayers(){
        return game.users.filter((user) => {
            return (user.role == CONST.USER_ROLES.PLAYER || user.role == CONST.USER_ROLES.TRUSTED);
        });
    }
}

export { PermissionHelper };
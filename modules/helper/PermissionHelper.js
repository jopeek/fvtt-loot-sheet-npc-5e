class PermissionHelper {

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
     * @param {number} level Permission level as {number} or {null}
     * 
     * @returns {Array<object>|object}
    */
    static getPermissionInfo(level = null) {
        const permissions = {
            0: { class: 'fas fa-ban', description: game.i18n.localize('lsnpc.permissions.0.desc'), title: game.i18n.localize('lsnpc.permissions.0.title') },
            2: { class: 'fas fa-eye', description: game.i18n.localize('lsnpc.permissions.2.desc'), title: game.i18n.localize('lsnpc.permissions.2.title') },
            3: { class: 'fas fa-check', description: game.i18n.localize('lsnpc.permissions.3.desc'), title: game.i18n.localize('lsnpc.permissions.3.title') },
        };
        return (!level && level != 0) ? permissions : permissions[parseInt(level)];
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
            3: "Owner (can access items and share coins)"
        };
        return description[level];
    }

    /**
     * Change the permission of players for an actor
     * by reading the dataset value of a permission option
     * 
     * @param {event} event
     * @param {Actor5e} actor
     * 
     * @uses  {Array<User>} users The games users
     **/
    static setPermissions(event, actor) {
        event.preventDefault();
        const actorData = actor.data,
            lootPermissions = new PermissionControl(actor),
            htmlObject = event.currentTarget,
            users = game.users.entities,
            permissionValue = (!htmlObject.dataset.value)? 0 : parseInt(htmlObject.dataset.value);
        let currentPermissions = duplicate(actorData.permission);
         
        //update permissions object
        for (let user of users) {
            if (user.data.role === 1 || user.data.role === 2) {
                currentPermissions[user._id] = permissionValue;
            }
        }

        //update the actor with new permissions
        lootPermissions._updateObject(event, currentPermissions);
    }

    /* -------------------------------------------- */

    /**
     * 
     * @param {ActorData} actor A token actor sheets actorData 
     * @param {number} playerId 
     * @param {number} newLevel 
     * @param {event} event
     * 
     * @uses PermissionControl 
     */
    static _updatePermissions(event, actor, playerId, newLevel) {
        // Read player permission on this actor and adjust to new level
        let currentPermissions = duplicate(actor.data.permission);
        currentPermissions[playerId] = newLevel;
        // Save updated player permissions
        const lootPermissions = new PermissionControl(actor);
        lootPermissions._updateObject(event, currentPermissions);
    }

    /**
     * Update given 'token' to permission 'level'
     * 
     * @param {Token5e} token A token object (dfault first selected token)
     * 
     * @param {number} level permission level (default 0)
     * @param {Array<User>}
     * 
     * @returns {Array<object>}
     * 
     * @version 1.0.0
     */
    static _updatedUserPermissions(
        token = canvas.tokens.controlled[0],
        level = CONST.ENTITY_PERMISSIONS.OBSERVER || 0,
        lootingUsers = PermissionHelper.getPlayers(),
    ) {
        let currentPermissions = duplicate(token.actor.data.permission);

        lootingUsers.forEach((user) => {
            currentPermissions[user.data._id] = level;
        });

        return currentPermissions;
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
     * Get all players and trusted players from game.users
     * 
     * @return {Array<User>}
     */
    static getPlayers() {
        return game.users.filter((user) => {
            return (user.role == CONST.USER_ROLES.PLAYER || user.role == CONST.USER_ROLES.TRUSTED);
        });
    }
}

export { PermissionHelper };
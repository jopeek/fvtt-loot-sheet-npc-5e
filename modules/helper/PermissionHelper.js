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
            0: { class: 'fas fa-ban', borderClass: 'none', description: game.i18n.localize('lsnpc.permissions.0.desc'), title: game.i18n.localize('lsnpc.permissions.0.title') },
            2: { class: 'fas fa-eye', borderClass: 'observer', description: game.i18n.localize('lsnpc.permissions.2.desc'), title: game.i18n.localize('lsnpc.permissions.2.title') },
            3: { class: 'fas fa-check', borderClass: 'owner', description: game.i18n.localize('lsnpc.permissions.3.desc'), title: game.i18n.localize('lsnpc.permissions.3.title') },
        };
        return (!level && level != 0) ? permissions : permissions[parseInt(level)];
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
    static async assignPermissions(event, actor) {
        event.preventDefault();
        const actorData = actor.data,
            htmlObject = event.currentTarget,
            permissionValue = (!htmlObject.dataset.value)? 0 : parseInt(htmlObject.dataset.value);
        let currentPermissions = duplicate(actorData.permission);

        //update permissions object
        for (let user of game.users) {
            if (user.data.role === 1 || user.data.role === 2) {
                currentPermissions[user.id] = permissionValue;
            }
        }

        //update the actor with new permissions
        await actor.update({ permission: currentPermissions });
    }

    /**
     * @module lootsheetnpc5e.helpers.PermissionHelper.cyclePermissions
     * @title PermissionHelper.cyclePermissions
     * @description Update the permissions of an player on the given actor
     *
     * @param {ActorData} actor A token actor sheets actorData
     * @param {event} event
     * @param {string|null} playerId
     * @param {number|null} newLevel
     *
     * @version 1.0.0
     */
    static async cyclePermissions(
        event,
        actor,
        playerId = null,
        newLevel = null
        ) {
        event.preventDefault();
        const levels = [0, 2, 3];
        // Read player permission on this actor and adjust to new level
        let currentPermissions = duplicate(actor.data.permission);

        playerId = playerId || event.currentTarget.dataset.playerId;
        currentPermissions[playerId] = newLevel || levels[(levels.indexOf(parseInt(currentPermissions[playerId])) + 1) % levels.length];

        //update the actor with new permissions
        await actor.update({ permission: currentPermissions });
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
import { MODULE } from '../data/moduleConstants.js';
export class PermissionHelper {

    /**
     *
     * @version 1.0.1
     * @returns {User|false} GM user or false
     * */
    static getTargetGM() {
        let targetGM = game.users.filter((u) => {
            return u.isGM && u.active
        });

        return targetGM?.[0] || false;
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
    static async bulkPermissionsUpdate(event, actor) {
        event.preventDefault();
        const actorData = actor.data,
            htmlObject = event.currentTarget,
            permissionValue = (!htmlObject.dataset.value) ? 0 : parseInt(htmlObject.dataset.value);
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
        lootingUsers = this.getPlayers()
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

    /**
     * Get all players with at least the required permission level.
     * Execluding OWNER and GM
     *
     * @param {Actor5e} actor
     *
     * @returns {Array<User>} Array of users
     */
    static getEligablePlayerActors(actor, permissionLevel = CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER) {
        let eligables = this.getEligableIdsByLevel(actor);
        const permissionsFilter = actor.getFlag(MODULE.ns, 'permissionsFilter');
        console.log(`${MODULE.ns} | PermissionsHelper | getEligablePlayerActors | ${eligables.length} players with eligable characters found.`);

        switch (permissionsFilter) {
            case "1": // filter out those that do not view the scene
                eligables = this.filterByPlayerViewingScene(eligables);
                break;
            case "2": // filter out those thats do not have a token in the scene
                eligables = this.filterByTokenInScene(eligables);
                console.log(`${MODULE.ns} |  \\-->  | Filtered for players with a token in the tokens scene. ${eligables.length} players with eligable characters.`);
                break;
            case "3": // filter both
                eligables = this.filterByPlayerViewingScene(eligables);
                console.log(`${MODULE.ns} |  \\-->  | Filtered for players that view the scene. ${eligables.length} players with eligable characters.`);
                eligables = this.filterByTokenInScene(eligables);
                console.log(`${MODULE.ns} |  \\-->  | Filtered for players with a token in the tokens scene. ${eligables.length} players with eligable characters.`);
        }

        return eligables;
    }

    /**
     *
     * @param {Document} doc
     * @param {Array<number>} validLevels
     *
     * @returns {Array<string>}
     */
    static getEligableIdsByLevel(
        doc,
        validLevels = [
            CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED,
            CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER
        ]
    ) {
        return Object.entries(doc.data.permission)
            .reduce((all, c) => {
                const [userId, level] = c;
                if (userId === 'default') return all;
                if (validLevels.includes(level)) all.push(userId);
                return all;
            }, []);
    }

    /**
     * @summary Filter out the eligables without a token in the scene.
     *
     * @description
     * Takes an array of eligable userIds and filters
     * out those that do not have a token in the scene.
     *
     * @param {Array<string>} eligables
     *
     * @returns {Array<string>} eligables
     *
     * @author Idle <Idle#3251>
     *
     * @version 1.0.0
     */
    static filterByTokenInScene(eligables) {
        return Array.from(canvas.tokens.placeables.reduce((acc, curr) => {
            if (!curr.actor.hasPlayerOwner) return acc
            for (const id of Object.keys(curr.actor.data.permission)) {
              if (eligables.includes(id)) acc.add(id);
            }
            return acc
          }, new Set()));

        //eligables = canvas.tokens.placeables.filter(t => t.actor.hasPlayerOwner).map(t => Object.keys(t.actor.data.permission).filter(k => eligables.includes(k)));
    }

    /**
     *
     * @description
     * Filters out the eligable playerIDs where the player
     * does not view the scene by the time of the check.
     *
     * @param {Array<string>} eligables
     *
     * @returns {Array<string>} eligables
     *
     * @author Daniel Böttner <@DanielBoettner>
     *
     * @version 1.0.0
     * @since 3.4.5.3
     */
    static filterByPlayerViewingScene(eligables) {
        const playersInScene = game.users.players.filter((player) => player.viewedScene == actor.parent.parent.id).map(p => p.id);
        eligables = eligables.filter(playerId => playersInScene.includes(playerId));
        console.log(`${MODULE.ns} |  \\-->  | Filtered for players that view the scene. ${eligables.length} players with eligable characters.`);
        return eligables;
    }
}
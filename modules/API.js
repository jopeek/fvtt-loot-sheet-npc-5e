import { PermissionHelper } from './helper/PermissionHelper.js';
import { LootSheetNPC5eHelper } from "./helper/Helper.js";
import { MODULE } from './config.js';

class API {
    /**
       * Converts the provided token to a lootable sheet
       *
       * Adapted from dfreds pocketChange Module
       * Originally adappted from the convert-to-lootable.js by @unsoluble, @Akaito, @honeybadger, @kekilla, and @cole.
       * 
       * @param {object} options
       * @param {Token5e} options.token - the token to convert
       * @param {string} options.type
       * @param {number} options.chanceOfDamagedItems - (optional) the chance an item is considered damaged from 0 to 1. Uses the setting if undefined
       * @param {number} options.damagedItemsMultiplier - (optional) the amount to reduce the value of a damaged item by. Uses the setting if undefined
       * @param {boolean} options.removeDamagedItems - (optional) if true, removes items that are damaged of common rarity
       */
    static async convertToken({
        token,
        type,
        chanceOfDamagedItems,
        damagedItemsMultiplier,
        removeDamagedItems,
        },
        verbose = false
    ) {
        chanceOfDamagedItems ??= 0;
        damagedItemsMultiplier ??= 0;
        removeDamagedItems ??= false;

        if(!token && verbose) API._verbose({code: 403, msg: 'No token selected or supplied'});
        if(!token) return {code: 403, msg: 'No token selected or supplied'};

        const sheet = token.actor.sheet,
            priorState = sheet._state, // -1 for opened before but now closed, // 0 for closed and never opened // 1 for currently open
            lootIcon = 'icons/svg/chest.svg';

        let newActorData = {
            flags: {
                core: {
                    sheetClass: 'dnd5e.LootSheet5eNPC',
                },
                lootsheetnpc5e: {
                    lootsheettype: 'Loot',
                },
            },
        };

        if (type && type.toLowerCase() === 'merchant'){
            newActorData.flags.lootsheetnpc5e.lootsheettype = 'Merchant';
            lootIcon = 'icons/svg/coins.svg';
        }

        // Close the old sheet if it's open
        await sheet.close();

        newActorData.items = LootSheetNPC5eHelper._getLootableItems(
            token.actor.items,
            chanceOfDamagedItems,
            damagedItemsMultiplier,
            removeDamagedItems,
        );

        // Delete all items first
        await token.document.actor.deleteEmbeddedDocuments(
            'Item',
            Array.from(token.actor.items.keys())
        );

        // Update actor with the new sheet and items
        await token.document.actor.update(newActorData);

        // Update the document with the overlay icon and new permissions
        await token.document.update({
            overlayEffect: lootIcon,
            vision: false,
            actorData: {
                actor: {
                    flags: {
                        loot: {
                            playersPermission: CONST.ENTITY_PERMISSIONS.OBSERVER,
                        },
                    },
                },
                permission: PermissionHelper._getUpdatedUserPermissions(token),
            },
        });

        // Deregister the old sheet class
        token.actor._sheet = null;
        delete token.actor.apps[sheet.appId];

        if (priorState > 0) {
            // Re-draw the updated sheet if it was open
            token.actor.sheet.render(true);
        }

        if(verbose) API._verbose({code: 403, msg: 'No token selected or supplied'});
        return {code: 200, msg: 'success'};
    }

    /**
     * Convert a stack of Tokens to a given type, apply modifiers if given
     * 
     * @param {Array<Token5e} tokens Array of ActorTokens
     * @param {string} type Type of sheet (loot|merchant)
     * @param {object} options 
     */
    static convertTokens(tokens = canvas.tokens.controlled, type = 'Loot' , options = {}){
        for (let token of tokens){
            API.convertToken({token, type, ...options});
        }
    }

    /**
     * 
     * @param {Token} tokens A token or null (defaults to all controlled tokens)
     * @param {Array<User>|null} players Optional array with users to update (defaults to all) 
     * @returns {Array<object>} Array with user permissions
     */
    static makeObservable (
        tokens = game.canvas.tokens.controlled,
        players
    ) {
        return PermissionHelper._getUpdatedUserPermissions(tokens,players);
    }

    /**
     *  Return the player(s) current permissions or the tokens default permissions
     * 
     * @param {token}
     * @param {Array<User>|null} players Optional array with users to update (defaults to all)
     * @returns {object} permissions Array of an permission enum values or a single permission
     */
    static getPermissionForPlayers (
        token = canvas.tokens.controlled[0],
        players = PermissionHelper.getPlayers(),
        verbose = false
    ) {
        if(!token && verbose) API._verbose({code: 403, msg: 'No token selected or supplied'});
        if(!token) return {code: 403, msg: 'No token selected or supplied'};
        

        let permissions = {};
        for (let player of players){
            permissions[player.data._id] = PermissionHelper.getLootPermissionForPlayer(token.actor.data ,player); 
            if (verbose) API._verbose('Player:' + player.data.name + ' has permission ' + permissions[player.data._id]);  
        }
        if (verbose) API._verbose({code: 200, msg: 'success', data: permissions});
        return {code: 200, msg: 'success', data: permissions};
    }

    /**
     * 
     * @param {string} text 
     */
    static _verbose(text){
        console.log(MODULE.ns + ' - API | ', text);
    }
}

export { API };
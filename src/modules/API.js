import { PermissionHelper } from './helper/PermissionHelper.js';
import { LootSheetNPC5eHelper } from "./helper/LootSheetNPC5eHelper.js";
import { MODULE } from './data/moduleConstants.js';
import { LootSeeder } from './classes/LootSeeder.js';
import { TableRoller } from './classes/TableRoller.js';
import { LootProcessor } from './classes/LootProcessor.js';
import { CurrencyHelper } from './helper/CurrencyHelper.js';

/**
 * @description The lootsheet API
 *
 * @module lootsheetnpc5e.API
 *
 * @title Lootsheet NPC 5e API
 * @version 1.0.0
 */
class API {

    /**
   * @title Converts the provided token to a lootable sheet
   *
   * @note titleAdapted from dfreds pocketChange Module
   * Originally adappted from the convert-to-lootable.js by @unsoluble, @Akaito, @honeybadger, @kekilla, and @cole.
   *
   * @module lootsheetnpc5e.API.convertToken
   *
   * @param {object} options
   * @param {Token5e} token - the token to convert
   * @param {string} type Type of Lootsheet
   * @param {number} options.chanceOfDamagedItems - (optional) the chance an item is considered damaged from 0 to 1. Uses the setting if undefined
   * @param {number} options.damagedItemsMultiplier - (optional) the amount to reduce the value of a damaged item by. Uses the setting if undefined
   * @param {boolean} options.removeDamagedItems - (optional) if true, removes items that are damaged of common rarity
   */
    static async convertToken(
        token = canvas.tokens.controlled[0],
        type = 'loot',
        options = {},
        verbose = false
    ) {
        let response = API._response(200, 'success');
        if (!token) {
            response.code = 403;
            response.msg = 'No token selected or supplied';
            response.error = true;
            if (verbose) API._verbose(response);
            return response;
        }

        if (!game.user.isGM) return;
        if (!token.actor.sheet) return;

        const sheet = token.actor.sheet,
            priorState = sheet._state; // -1 for opened before but now closed, // 0 for closed and never opened // 1 for currently open

        let lootIcon = 'icons/svg/chest.svg';

        let newActorData = {
            flags: {
                core: {
                    sheetClass: 'dnd5e.LootSheetNPC5e',
                },
                lootsheetnpc5e: {
                    lootsheettype: 'Loot',
                },
            },
        };

        if (type && type.toLowerCase() === 'merchant') {
            newActorData.flags.lootsheetnpc5e.lootsheettype = 'Merchant';
            lootIcon = 'icons/svg/coins.svg';
        }

        // Close the old sheet if it's open
        await sheet.close();

        newActorData.items = LootSheetNPC5eHelper.getLootableItems(
            token.actor.items,
            options
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
                        lootsheetnpc5e: {
                            playersPermission: CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER,
                        },
                    },
                },
                permission: PermissionHelper._updatedUserPermissions(token),
            },
        });

        // Deregister the old sheet class
        token.actor._sheet = null;
        delete token.actor.apps[sheet.appId];

        if (priorState > 0) {
            // Re-draw the updated sheet if it was open
            token.actor.sheet.render(true);
        }

        response.data = token;
        if (verbose) API._verbose(response);
        return response;
    }

    /**
     * @title convertTokens()
     * @description Convert a stack of Tokens to a given type, apply modifiers if given
     * @module lootsheetnpc5e.API.convertTokens
     *
     * @param {Array<Token5e>} tokens Array of ActorTokens
     * @param {string} type Type of sheet (loot|merchant)
     * @param {object} options
     * @returns {object}
     */
    static async convertTokens(
        tokens,
        type = 'loot',
        options = {},
        verbose = false
    ) {
        const tokenstack = (tokens) ? (tokens.length > 0) ? tokens : [tokens] : canvas.tokens.controlled;

        let response = API._response(200, 'success');

        for (let token of tokenstack) {
            response.data[token.uuid] = await API.convertToken(token, type, options, verbose)
        }

        if (verbose) API._verbose(response);
        return response;
    }

    /**
     *
     * @param  {...any} args
     *
     * @deprecated use addLootToTarget instead
     */
    static async addLootToSelectedToken(...args) {
        this.addLootToTarget(...args);
    }

    /**
     * Roll a table an add the resulting loot to a given target.
     *
     * @param {RollTable} table
     * @param {Array<Actor|PlaceableObject>|Actor|PlaceableObject} stack
     * @param {options} object
     *
     * @returns
     */
    static async addLootToTarget(stack = null, table = null, options = {}) {
        let tokenstack = [];

        if (null == stack && (canvas.tokens.controlled.length === 0)) {
            return ui.notifications.error('No tokens given or selected');
        } else {
            tokenstack = (stack) ? (stack.length >= 0) ? stack : [stack] : canvas.tokens.controlled;
        }

        if (options?.verbose) ui.notifications.info(MODULE.ns + ' | API | Loot generation started for.');

        let tableRoller = new TableRoller(table);

        for (let target of tokenstack) {
            const actor = (target.actor) ? target.actor : target;
            const rollResults = await tableRoller.roll(options),
                lootProcess = new LootProcessor(rollResults, actor, options),
                betterResults = await lootProcess.buildResults(options);

            await CurrencyHelper.addCurrenciesToActor(actor, betterResults?.currency);
            lootProcess.addItemsToActor(actor, options);
        }

        if (options?.verbose) return ui.notifications.info(MODULE.ns + ' | API | Loot generation complete.');
    }

    /**
     * @module lootsheetnpc5e.API.makeObservable
     *
     * @description Make the provided tokens observable
     *
     * @param {Token|Array<Token>} tokens A a selection tokens or null (defaults to all controlled tokens)
     * @param {Array<User>|null} players Optional array with users to update (defaults to all)
     *
     * @returns {object} API response object
     */
    static async makeObservable(
        tokens = game.canvas.tokens.controlled,
        players = PermissionHelper.getPlayers(),
        verbose = false
    ) {
        if (!game.user.isGM) return;

        const tokenstack = (tokens) ? (tokens.length > 0) ? tokens : [tokens] : canvas.tokens.controlled;

        let response = API._response(200, 'success'),
            responseData = {};

        for (let token of tokenstack) {
            if (!token.actor || token.actor.hasPlayerOwner) continue;      
            token.actor.data.permission = PermissionHelper._updatedUserPermissions(token, CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER, players);  
            await token.document.update({actor: {data: {permission: token.actor.data.permission}}});
        }

        response.data = responseData;
        if (verbose) API._verbose(response);
        return response;
    }

    /**
     * @description Return the player(s) current permissions or the tokens default permissions
     *
     * @module lootsheetnpc5e.API.getPermissionForPlayers
     *
     * @param {Token} token token or null (defaults to all controlled tokens)
     * @param {Array<User>|null} players Optional array with users to update (defaults to all)
     * @returns {object} permissions Array of an permission enum values or a single permission
     */
    static getPermissionForPlayers(
        token = canvas.tokens.controlled[0],
        players = PermissionHelper.getPlayers(),
        verbose = false
    ) {
        let response = API._response(200, 'success', {});
        if (!token) {
            response.code = 403;
            response.msg = 'No token selected or supplied';
            if (verbose) API._verbose(response);
            return response;
        }

        for (let player of players) {
            response.data[player.data._id] = PermissionHelper.getLootPermissionForPlayer(token.actor.data, player);
        }

        if (verbose) API._verbose(response);
        return response;
    }

    /**
     * Use the PermissionHelper to update the users permissions for the token
     *
     * @param {Token} token
     * @param {number|null} permission enum
     *
     * @return {object} reponse object
     */
    static async updatePermissionForPlayers() {
        let response = API._response(200, permissions, 'success');
        const
            tokens = canvas.tokens.controlled,
            players = PermissionHelper.getPlayers();

        for (let token of tokens) {
            const
                permissions = PermissionHelper._updatedUserPermissions(token, players);

            response.data[token.data.uuid] = permissions;
        }

        if (verbose) API._verbose(response);
        return response;
    }

    /**
     * @summary get the filter rules that exist for the loot sheet seeder
     * @returns {object}
     */
    static getRegisteredCustomRules() {
        return game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.ruleset);
    }

    /**
     * Update the lootseeder custom rules
     *
     * Expects a {lootseederRule} object
     *
     * @param {lootseederRule} rule
     */
    static addCustomRule(rule) {
        /**
         * @param {lootseederRule} currentRules
         */
        let currentRules = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.ruleset);
        game.settings.set(MODULE.ns, MODULE.settings.keys.lootseeder.ruleset, { ...currentRules, rule });
    }

    /**
     *
     * @param {boolean} state
     * @deprecated use toggleSeederState instead
     */
    static switchPopulatorState(state = null) {
        return this.toggleSeederState(state);
    }

    /**
     * @param {boolean} state
     *
     *
     * @returns {boolean}
     */
    static toggleSeederState(state = null) {
        if (state === null) {
            state = !game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.autoSeedTokens);
        }

        game.settings.set(MODULE.ns, MODULE.settings.keys.lootseeder.autoSeedTokens, state);

        return game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.autoSeedTokens);
    }

    /**
     * @description Seed items to a given token (or the selected tokens)
     *
     * @module lootsheetnpc5e.API.populateTokenWithOptions
     *
     * @param {Token} token
     * @param {object} options
     */
    static async seedItemsToTokens(token = null, options = null) {
        const actors = (token) ? [token.actor] : canvas.tokens.controlled.map(t => t.actor);
        await LootSeeder.seedItemsToActors(actors, options);
    }

    /**
     * @description Verbose ouput wrapper
     *
     * @module lootsheetnpc5e.API._verbose
     * @param {string} text
     * @private
     */
    static _verbose(data = '') {
        console.log(`${MODULE.ns} | API (verbose output) | data, '|--- ' + MODULE.ns + ' API (/verbose output)---|`);
    }

    static _response(code, msg = '', data = {}, error = false) {
        return {
            code: code,
            data: data,
            msg: msg,
            error: error
        }
    }
}

export { API };
import ActorSheet5eNPC from "/systems/dnd5e/module/actor/sheets/npc.js";

// ⬆️ 5e core imports

import { MODULE } from "../../data/moduleConstants.js";
import { LootSheetNPC5eHelper } from "../../helper/LootSheetNPC5eHelper.js";
import { PermissionHelper } from '../../helper/PermissionHelper.js';
import { tableHelper } from "../../helper/tableHelper.js";
import { SheetListener } from "../../hooks/SheetListener.js";
import { CurrencyHelper } from "../../helper/currencyHelper.js";

// ⬆️ module imports

/**
 * @module lootsheetnpc5e.LootSheet5eNPC
 * @description A class for handling the loot sheet for NPCs.
 *
 */
export class LootSheetNPC5e extends ActorSheet5eNPC {

    /**
     * @module lootsheetnpc5e.LootSheet5eNPC.template
     * @description Handle template loading for the sheet
     */
    get template() {
        const sheetType = 'default',
            fallbackPath = "systems/dnd5e/templates/actors/";

        let templateList = [
            MODULE.templateAppsPath + "/lootsheet.hbs",
            MODULE.templatePartialsPath + "/body.hbs",
            MODULE.templatePartialsPath + "/footer.hbs",
            MODULE.templatePartialsPath + "/header.hbs",
            MODULE.templatePartialsPath + "/header/navigation.hbs",
            MODULE.templatePartialsPath + "/list/" + sheetType + ".hbs",
            MODULE.templatePartialsPath + "/list/currency.hbs",
            MODULE.templatePartialsPath + "/list/actions.hbs",
            MODULE.templatePartialsPath + "/trade/index.hbs",
            MODULE.templatePartialsPath + "/trade/currency.hbs",
            MODULE.templatePartialsPath + "/trade/inventory.hbs"
        ];

        if (game.user.isGM) {
            templateList.push(MODULE.templatePartialsPath + "/gm/gm-settings.hbs");
            templateList.push(MODULE.templatePartialsPath + "/gm/inventory.hbs");
            templateList.push(MODULE.templatePartialsPath + "/gm/lootsheet-type.hbs");
            templateList.push(MODULE.templatePartialsPath + "/gm/permissions.hbs");
            templateList.push(MODULE.templatePartialsPath + "/gm/styling.hbs");
        }

        loadTemplates(templateList);

        if (!game.user.isGM && this.actor.limited) return fallbackPath + "limited-sheet.html";

        return MODULE.templateAppsPath + "/lootsheet.hbs";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        let lsnpcOptions = {
            classes: ["dnd5e", "sheet", "actor", "lsnpc", "npc", "npc-sheet"],
        };

        if (game.user.isGM) {
            lsnpcOptions.classes.push('lsnpc-gmview');
        }

        return mergeObject(options, lsnpcOptions);
    }

    /**
     *
     * @returns {object} Data for sheet to render
     */
    async getData() {
        const typeKey = "lootsheettype",
            sheetType = await this._prepareSheetType(typeKey);

        let sheetData = super.getData(),
            sheetDataActorItems = sheetData.actor.items;

        sheetData.lootsheettype = sheetType;
        sheetData.priceModifier = 1;
        sheetData.currency = CurrencyHelper.handleActorCurrency(sheetData.data.currency);

        if (game.user.isGM) {
            sheetData = await this._prepareGMSettings(sheetData);
        }

        sheetData = await this._enrichByType(sheetData, sheetType);
        sheetDataActorItems = this._enrichItems(sheetDataActorItems);
        sheetDataActorItems = LootSheetNPC5eHelper.getLootableItems(sheetDataActorItems);
        let totals = this._getTotals(sheetDataActorItems, sheetData.priceModifier);

        sheetData.isGM = (game.user.isGM) ? true : false;
        sheetData.items = sheetDataActorItems;
        sheetData.interactingActor = game.user?.character?.name || "No Character";
        sheetData.totalItems = sheetDataActorItems.length;
        sheetData.totalWeight = totals.weight.toLocaleString('en');
        sheetData.totalPrice = totals.price.toLocaleString('en') + " gp";
        sheetData.totalQuantity = totals.quantity;
        sheetData.observerCount = PermissionHelper.getEligablePlayerActors(this.actor).length;
        sheetData.distributeCoins = game.settings.get(MODULE.ns, "distributeCurrency");
        sheetData.lootCurrency = game.settings.get(MODULE.ns, "lootCurrency");
        sheetData.lootAll = game.settings.get(MODULE.ns, "lootAll");
        sheetData.colorRarity = game.settings.get(MODULE.ns, "colorRarity");
        return sheetData;
    }


    render(force = false, options = {}) {
        /**
         * @type {Array<string>} appClasses
         */
        let appClasses = this.options.classes;
        const sheetStyle = this.actor.getFlag(MODULE.ns, 'sheettint.style'),
            darkMode = this.actor.getFlag(MODULE.ns, 'darkMode'),
            existingStylingIndex = appClasses.findIndex(e => (e.indexOf('styled') >= 0)),
            existingDarkModeIndex = appClasses.findIndex(e => (e.indexOf('darkMode') >= 0));

        if (existingStylingIndex > 0) appClasses.splice(existingStylingIndex, 1);
        if (existingDarkModeIndex > 0) appClasses.splice(existingDarkModeIndex, 1);
        if (darkMode === 'true') appClasses.push("lsnpc-darkMode");
        if (sheetStyle && sheetStyle.length) appClasses.push('styled ' + sheetStyle);


        this.options.classes = [...new Set(appClasses)];

        super.render(force, options);
    }

    /**
     * Enrich the data with data needed by diffrerent sheet types
     *
     * @param {object} sheetData
     * @param {string} sheetType
     * @returns
     */
    async _enrichByType(sheetData, sheetType) {
        //enricht sheetData with type specific data
        switch (sheetType) {
            case "Merchant":
                sheetData.priceModifier = await this.actor.getFlag(MODULE.ns, MODULE.flags.priceModifier);
                if (typeof sheetData.priceModifier !== 'number') await this.actor.setFlag(MODULE.ns, MODULE.flags.priceModifier, 1.0);
                sheetData.priceModifier = await this.actor.getFlag(MODULE.ns, MODULE.flags.priceModifier);
                break;
            default:
                break;
        }

        return sheetData;
    }

    /**
     * @summary Einrich the item data for the template with a uuid
     *
     * @param {object} sheetData
     */
    _enrichItems(sheetDataActorItems) {
        //enrich with uuid
        for (let fullItem of this.actor.getEmbeddedCollection('Item')) {
            let sheetItem = sheetDataActorItems.find(i => i._id == fullItem.id);
            if (!sheetItem) continue;
            sheetItem.uuid = fullItem.uuid;
        }

        return sheetDataActorItems;
    }

    /**
     *
     * @param {*} sheetDataActorItems
     * @param {number} priceModifier
     * @returns
     */
    _getTotals(sheetDataActorItems, priceModifier = 1.0) {
        let totalWeight = 0,
            totalPrice = 0,
            totalQuantity = 0;

        sheetDataActorItems.forEach((item) => totalPrice += Math.round((item.data.quantity * item.data.price * priceModifier * 100) / 100));
        sheetDataActorItems.forEach((item) => totalQuantity += Math.round((item.data.quantity * 100) / 100));
        sheetDataActorItems.forEach((item) => totalWeight += Math.round((item.data.quantity * item.data.weight * 100) / 100));

        if (game.settings.get(MODULE.ns, "includeCurrencyWeight")) {
            totalWeight += (Object.values(this.actor.data.data.currency).reduce(function (accumVariable, curValue) {
                return accumVariable + curValue
            }, 0) / 50).toNearest(0.01);
        }

        return { weight: totalWeight, price: totalPrice, quantity: totalQuantity };
    }

    /**
     *
     * @param {string} typeKey
     * @returns
     */
    async _prepareSheetType(typeKey) {
        let type = this.actor.getFlag(MODULE.ns, typeKey)
        if (!type) {
            type = "Loot";
            await this.actor.setFlag(MODULE.ns, typeKey, type);
        }
        return type;
    }

    async _onSubmit(e) {
        e.preventDefault();
        super._onSubmit(e);
    }


    /**
     * @param {jquery} html
     *
     * @version 1.1.0
     *
     * @override
     */
    activateListeners(html) {
        super.activateListeners(html);

        const listener = new SheetListener(this.id, this.token, this.actor, this.options);
        listener.activateListeners();
    }

    /**
     *
     * @param {*} sheetData
     */
    _setClasses(sheetData) {
        const darkMode = this.actor.getFlag(MODULE.ns, 'darkMode'),
            sheetStyleBackground = this.actor.getFlag(MODULE.ns, 'sheettint.style');

        if (darkMode) this.options.classes.push("lsnpc-darkDmode");
        if (!sheetStyleBackground.length) this.options.classes.push("lsnpc-styled");
    }

    /* -------------------------------------------- */

    /**
     * Organize and classify Items for Loot NPC sheets
     * IDE shows it as unused, but it is used in the NPC sheet
     *
     * @private
     */
    _prepareItems(actorData) {
        const items = actorData.items,
            lootableItems = LootSheetNPC5eHelper.getLootableItems(items),
            playerCharacter = game.user.character;

        //enrich with uuid
        for (let fullItem of this.actor.getEmbeddedCollection('Item')) {
            items.find(i => i._id == fullItem.id).uuid = fullItem.uuid;
        }

        // Iterate through items, allocating to containers
        actorData.actor.actions = LootSheetNPC5eHelper.sortAndGroupItems(items);
        actorData.actor.lootableItems = LootSheetNPC5eHelper.sortAndGroupItems(lootableItems);

        if (playerCharacter) {
            let playerItems = duplicate(playerCharacter.data.items);
            //enrich with uuid
            for (let fullItem of playerCharacter.getEmbeddedCollection('Item')) {
                playerItems.find(i => i._id == fullItem.id).uuid = fullItem.uuid;
            }
            playerItems = LootSheetNPC5eHelper.getLootableItems(playerItems);
            actorData.actor.playerInventory = LootSheetNPC5eHelper.sortAndGroupItems(playerItems);
        }
    }

    /**
     * @summary Prepares GM settings to be rendered by the loot sheet.
     *
     * @param {object} sheetData
     * @author Jan Ole Peek <@jopeek>
     *
     * @version 1.1.0
     *
     * @returns {object} sheetData
     */
    async _prepareGMSettings(sheetData) {
        const observers = PermissionHelper.getEligablePlayerActors(this.actor),
            permissionsInfo = PermissionHelper.getPermissionInfo(),
            [playerData, playersPermission] = this._playerPermissions(sheetData),
            currencySplit = CurrencyHelper.getSplitByObservers(sheetData.data.currency, observers.length),
            gameWorldTables = await tableHelper.getGameWorldRolltables();

        let loot = {};
        loot.players = playerData;
        loot.observerCount = observers.length;
        loot.currency = currencySplit;
        loot.permissions = permissionsInfo;
        loot.playersPermission = playersPermission;
        loot.playersPermissionIcon = PermissionHelper.getPermissionInfo(playersPermission);
        loot.playersPermissionDescription = PermissionHelper.getPermissionInfo(playersPermission)?.description;

        sheetData.rolltables = gameWorldTables;
        sheetData.actor.flags.lootsheetnpc5e = loot;

        return sheetData;
    }

    /**
     * @description
     * Parse the sheetData and fill an array with specific player permissions.
     *
     * @param {object} sheetData
     * @private
     * @param {Actor|object} sheetData
     */
    _playerPermissions(sheetData) {
        // get all the players
        const players = game.users.players;

        let playerData = [],
            commonPlayersPermission = -1;

        for (let player of players) {
            // get primary/active actor for a player
            const playerActor = game.actors.get(player.data.character);

            if (playerActor) {
                player.actor = playerActor.data.name;
                player.actorId = playerActor.data._id;
                player.playerId = player.data._id;
                player.lootPermission = PermissionHelper.getLootPermissionForPlayer(sheetData.actor, player);

                commonPlayersPermission = (commonPlayersPermission < 0) ? player.lootPermission : commonPlayersPermission;

                const lootPermissionInfo = PermissionHelper.getPermissionInfo(player.lootPermission);

                player.class = lootPermissionInfo.class;
                player.borderClass = lootPermissionInfo.borderClass;
                player.lootPermissionDescription = lootPermissionInfo.description;
                playerData.push(player);
            }
        }
        return [playerData, commonPlayersPermission];
    }
}

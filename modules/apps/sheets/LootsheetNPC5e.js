import ActorSheet5eNPC from "/systems/dnd5e/module/actor/sheets/npc.js";
import Item5e from "/systems/dnd5e/module/item/entity.js";
// ⬆️ 5e core imports

import { MODULE } from "../../data/moduleConstants.js";
import { LootSheetNPC5eHelper } from "../../helper/LootSheetNPC5eHelper.js";
import { PermissionHelper } from '../../helper/PermissionHelper.js';
import { tableHelper } from "../../helper/tableHelper.js";
import { sheetListener } from "../../hooks/sheetListener.js";
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
            fallbackPath = "systems/dnd5e/templates/actors/",
            lootsheetType = this.actor.getFlag(MODULE.ns, "lootsheettype");

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
            classes: ["dnd5e sheet actor npc npc-sheet lsnpc-app loot-sheet-npc"],
        };

        if (game.user.isGM) {
            lsnpcOptions.classes[0] += " loot-sheet-npc-gmview";
        }

        return mergeObject(options, lsnpcOptions);
    }

    /**
     *
     * @returns {object} Data for sheet to render
     */
    async getData() {
        const typeKey = "lootsheettype",
            sheetData = super.getData(),
            gameWorldTables = await tableHelper.getGameWorldRolltables();

        this._setClasses(sheetData);
        this._prepareGMSettings(sheetData.actor);

        let sheetType = await this.actor.getFlag(MODULE.ns, typeKey),
            priceModifier = 1.0,
            sheetDataActorItems = sheetData.actor.items,
            totalWeight = 0,
            totalPrice = 0,
            totalQuantity = 0;

        //enrich with uuid
        for (let fullItem of this.actor.getEmbeddedCollection('Item')) {
            let sheetItem = sheetDataActorItems.find(i => i._id == fullItem.id);
            if(!sheetItem) continue;
            sheetItem.uuid = fullItem.uuid;
        }

        /**
         * We only care for the lootable items now.
         */
        sheetDataActorItems = LootSheetNPC5eHelper.getLootableItems(sheetDataActorItems)

        if (!sheetType) await this.actor.setFlag(MODULE.ns, typeKey, "Loot");
        sheetType = await this.actor.getFlag(MODULE.ns, typeKey);

        if (sheetType === "Merchant") {
            const priceModStr = "priceModifier";
            priceModifier = await this.actor.getFlag(MODULE.ns, priceModStr);
            if (typeof priceModifier !== 'number') await this.actor.setFlag(MODULE.ns, priceModStr, 1.0);
            priceModifier = await this.actor.getFlag(MODULE.ns, priceModStr);
        }

        sheetDataActorItems.forEach((item) => totalWeight += Math.round((item.data.quantity * item.data.weight * 100) / 100));

        if (game.settings.get(MODULE.ns, "includeCurrencyWeight"))
            totalWeight += (Object.values(this.actor.data.data.currency).reduce(function (accumVariable, curValue) {
                return accumVariable + curValue
            }, 0) / 50).toNearest(0.01);

        sheetDataActorItems.forEach((item) => totalPrice += Math.round((item.data.quantity * item.data.price * priceModifier * 100) / 100));
        sheetDataActorItems.forEach((item) => totalQuantity += Math.round((item.data.quantity * 100) / 100));

        // Booleans
        sheetData.isGM = (game.user.isGM) ? true : false;

        // Items
        sheetData.items = sheetDataActorItems;

        // rest
        sheetData.lootsheettype = sheetType;
        sheetData.isCondensedView = false; //game.settings.get(MODULE.ns, "useCondensedLootsheet");
        sheetData.totalItems = sheetDataActorItems.length;
        sheetData.totalWeight = totalWeight.toLocaleString('en');
        sheetData.totalPrice = totalPrice.toLocaleString('en') + " gp";
        sheetData.totalQuantity = totalQuantity;
        sheetData.priceModifier = priceModifier;
        sheetData.rolltables = gameWorldTables; //game.tables.entities;
        sheetData.lootCurrency = game.settings.get(MODULE.ns, "lootCurrency");
        sheetData.lootAll = game.settings.get(MODULE.ns, "lootAll");
        sheetData.colorRarity = game.settings.get(MODULE.ns, "colorRarity");
        return sheetData;
    }

    async _onSubmit(e) {
        e.preventDefault();
        let options = {},
            inventorySettings = document.querySelector('.inventory-settings');

        if (game.user.isGM && inventorySettings && inventorySettings.contains(e.currentTarget)) {
            options.preventClose = true;
            options.preventRender = true;
        }

        super._onSubmit(e, options);
    }


    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * Activate event listeners using the prepared sheet HTML
     *
     * @param html {HTML} The prepared HTML object ready to be rendered into the DOM
     * @todo change to use native JS methods instead of jQuery
     */
    activateListeners(html) {
        super.activateListeners(html);

        /**
         * @todo Move to the listner
         */
        if (this.options.editable) {
            // Change Permissions for all players
            html.find('.permission-option a').click(ev => PermissionHelper.assignPermissions(ev, this.actor));
            // Cycle Permissions for an indidual player.
            html.find('.permission-proficiency').click(ev => PermissionHelper.cyclePermissions(ev, this.actor));

            // Price Modifier
            html.find('.price-modifier').click(ev => this._priceModifier(ev));
            html.find('.inventory-settings').change(ev => sheetListener.inventorySettingChange(ev, this.actor));
            html.find('.update-inventory').click(ev => sheetListener.inventoryUpdateListener(ev, this.actor, this.token));
        }


        let sheetActionButtons = document.querySelectorAll('.lsnpc-app .lsnpc-action-link');

        let tradeableItems = document.querySelectorAll('.tradegrid .item');
        //make items clickable and dragable
        sheetListener.tradeItemEventListeners(tradeableItems);

        for (let actionButton of sheetActionButtons) {
            const eventType = actionButton.nodeName === 'SELECT' ? 'change' : 'click';
            actionButton.toggleAttribute('disabled', false);
            actionButton.addEventListener(eventType, ev => LootSheetNPC5eHelper.sendActionToSocket(this.token, ev));
        }

        //document.addEventListener("DOMContentLoaded", () => {
        //ondragstart="event.dataTransfer.setData('text/plain',null)
        const tradeDropzone = document.querySelector('.lsnpc-app .tradegrid .dropzone');
        tradeDropzone.addEventListener('drop', (ev) => sheetListener.onDrop(ev));
        //});

        // toggle infoboxes
        html.find('.help').hover(e => e.currentTarget.nextElementSibling.classList.toggle('hidden'));
    }

    /**
     *
     * @param {*} sheetData
     */
    _setClasses(sheetData) {
        // sheetTint handling

        if (false && game.settings.get(MODULE.ns, "useCondensedLootsheet") || false && !sheetData.owner) {
            this.options.classes.push('lootsheet-condensed');
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle price modifier
     * @private
     */
    async _priceModifier(event) {
        event.preventDefault();

        const maxModifier = game.settings.get(MODULE.ns, "maxPriceIncrease");
        let priceModifier = await this.actor.getFlag(MODULE.ns, "priceModifier");

        if (typeof priceModifier !== 'number') priceModifier = 1.0;

        priceModifier = Math.round(priceModifier * 100);

        let html = "<p>Use this slider to increase or decrease the price of all items in this inventory. <i class='fa fa-question-circle' title='This uses a percentage factor where 100% is the current price, 0% is 0, and 200% is double the price.'></i></p>";
        html += '<p><input name="price-modifier-percent" id="price-modifier-percent" type="range" min="0" max="' + maxModifier + '" value="' + priceModifier + '" class="slider"></p>';
        html += '<p><label>Percentage:</label> <input type=number min="0" max="' + maxModifier + '" value="' + priceModifier + '" id="price-modifier-percent-display"></p>';
        html += '<script>var pmSlider = document.getElementById("price-modifier-percent"); var pmDisplay = document.getElementById("price-modifier-percent-display"); pmDisplay.value = pmSlider.value; pmSlider.oninput = function() { pmDisplay.value = this.value; }; pmDisplay.oninput = function() { pmSlider.value = this.value; };</script>';

        let d = new Dialog({
            title: "Price Modifier",
            content: html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Update",
                    callback: () => this.actor.setFlag(MODULE.ns, "priceModifier", document.getElementById("price-modifier-percent").value / 100)
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => console.log(MODULE.ns + " | Price Modifier Cancelled")
                }
            },
            default: "two",
            close: () => console.log(MODULE.ns + " | Price Modifier Closed")
        });
        d.render(true);
    }

    /* -------------------------------------------- */

    /**
     * Organize and classify Items for Loot NPC sheets
     *
     * @private
     */
    _prepareItems(actorData) {

        //console.log("Loot Sheet | Prepare Features");

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



    /* -------------------------------------------- */
    /* -------------------------------------------- */

    /**
     * Prepares GM settings to be rendered by the loot sheet.
     * @private
     * @param {Actor|object} actorData
     */

    _prepareGMSettings(actorData) {
        const playerData = [],
            observers = [],
            permissionsInfo = PermissionHelper.getPermissionInfo();
        let players = game.users.players,
            commonPlayersPermission = -1;

        for (let player of players) {
            // get the name of the primary actor for a player
            const actor = game.actors.get(player.data.character);

            if (actor) {
                player.actor = actor.data.name;
                player.actorId = actor.data._id;
                player.playerId = player.data._id;
                player.lootPermission = PermissionHelper.getLootPermissionForPlayer(actorData, player);

                if (player.lootPermission >= 2 && !observers.includes(actor.data._id)) {
                    observers.push(actor.data._id);
                }

                if (commonPlayersPermission < 0) {
                    commonPlayersPermission = player.lootPermission;
                } else if (commonPlayersPermission !== player.lootPermission) {
                    commonPlayersPermission = 0;
                }

                const lootPermissionInfo = PermissionHelper.getPermissionInfo(player.lootPermission);

                player.class = lootPermissionInfo.class;
                player.borderClass = lootPermissionInfo.borderClass;
                player.lootPermissionDescription = lootPermissionInfo.description;
                playerData.push(player);
            }
        }

        // calculate the split of coins between all observers of the sheet.
        let currencySplit = duplicate(actorData.data.currency);
        for (let c in currencySplit) {
            if (observers.length) {
                if (currencySplit[c] != null) {
                    currencySplit[c] = Math.floor(currencySplit[c] / observers.length);
                } else {
                    currencySplit[c] = 0;
                }
            }
        }

        let loot = {}
        loot.players = playerData;
        loot.observerCount = observers.length;
        loot.currency = currencySplit;
        loot.permissions = permissionsInfo;
        loot.playersPermission = commonPlayersPermission;
        loot.playersPermissionIcon = PermissionHelper.getPermissionInfo(commonPlayersPermission);
        loot.playersPermissionDescription = PermissionHelper.getPermissionInfo(commonPlayersPermission)?.description;
        actorData.flags.lootsheetnpc5e = loot;
    }
}
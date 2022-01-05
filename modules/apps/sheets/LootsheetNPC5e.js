import ActorSheet5eNPC from "/systems/dnd5e/module/actor/sheets/npc.js";
import Item5e from "/systems/dnd5e/module/item/entity.js";
// ⬆️ 5e core imports

import { MODULE } from "../../data/moduleConstants.js";
import { LootSheetNPC5eHelper } from "../../helper/LootSheetNPC5eHelper.js";
import { PermissionHelper } from '../../helper/PermissionHelper.js';
import { tableHelper } from "../../helper/tableHelper.js";

// this should be obsolete soon (we want to handle this in the helper)
import { QuantityDialog } from "../../classes/quantityDialog.js";
import { tokenHelper } from "../../helper/tokenHelper.js";
// ⬆️ module imports

/**
 * @module lootsheetnpc5e.LootSheet5eNPC
 * @description A class for handling the loot sheet for NPCs.
 *
 */
class LootSheetNPC5e extends ActorSheet5eNPC {

    /**
     * @module lootsheetnpc5e.LootSheet5eNPC.template
     * @description Handle template loading for the sheet
     */
    get template() {
        const sheetType = 'default',
              fallbackPath = "systems/dnd5e/templates/actors/";

        let templateList = [
            MODULE.templatePath + "/sheet.hbs",
            MODULE.templatePath + "/partials/list/" + sheetType + ".hbs",
            MODULE.templatePath + "/partials/header/" + sheetType + ".hbs"
        ];

        if(game.user.isGM) {
            templateList.push(MODULE.templatePath + "/partials/sidebar/sidebar.hbs");
            templateList.push(MODULE.templatePath + "/partials/sidebar/gm-settings/permissions.hbs");
        }

        loadTemplates(templateList);

        if (!game.user.isGM && this.actor.limited) return fallbackPath + "limited-sheet.html";

        return MODULE.templatePath + "/sheet.hbs";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        let lsnpcOptions = {
            classes: ["dnd5e sheet actor npc npc-sheet lsnpc-app loot-sheet-npc"],
        };

        if(game.user.isGM){
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
            itemContents = LootSheetNPC5eHelper.getLootableItems(sheetData.actor.items),
            totalWeight = 0,
            totalPrice = 0,
            totalQuantity = 0;

        if (!sheetType) await this.actor.setFlag(MODULE.ns, typeKey, "Loot");
        sheetType = await this.actor.getFlag(MODULE.ns, typeKey);

        if (sheetType === "Merchant") {
            const priceModStr = "priceModifier";
            priceModifier = await this.actor.getFlag(MODULE.ns, priceModStr);
            if (typeof priceModifier !== 'number') await this.actor.setFlag(MODULE.ns, priceModStr, 1.0);
            priceModifier = await this.actor.getFlag(MODULE.ns, priceModStr);
        }

        itemContents.forEach((item) => totalWeight += Math.round((item.data.quantity * item.data.weight * 100) / 100));

        if (game.settings.get(MODULE.ns, "includeCurrencyWeight"))
            totalWeight += (Object.values(this.actor.data.data.currency).reduce(function (accumVariable, curValue) {
                return accumVariable + curValue
                }, 0) / 50).toNearest(0.01);

        itemContents.forEach((item) => totalPrice += Math.round((item.data.quantity * item.data.price * priceModifier * 100) / 100));
        itemContents.forEach((item) => totalQuantity += Math.round((item.data.quantity * 100) / 100));

        // Booleans
        sheetData.isGM = (game.user.isGM) ? true : false;

        // Items
        sheetData.items = itemContents;

        // rest
        sheetData.lootsheettype = sheetType;
        sheetData.isCondensedView = false; //game.settings.get(MODULE.ns, "useCondensedLootsheet");
        sheetData.totalItems = itemContents.length;
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
        if (this.options.editable) {
            // Change Permissions for all players
            html.find('.permission-option a').click(ev => PermissionHelper.assignPermissions(ev, this.actor));
            // Cycle Permissions for an indidual player.
            html.find('.permission-proficiency').click(ev => PermissionHelper.cyclePermissions(ev, this.actor));

            // Price Modifier
            html.find('.price-modifier').click(ev => this._priceModifier(ev));
            html.find('.inventory-settings').change(ev => this._inventorySettingChange(ev));
            html.find('.update-inventory').click(ev => this._inventoryUpdate(ev));
        }


        let sheetActionButtons = document.querySelectorAll('.lsnpc-app .lsnpc-action-link');

        for (let actionButton of sheetActionButtons) {
            const eventType = actionButton.nodeName === 'SELECT' ? 'change' : 'click';
            actionButton.toggleAttribute('disabled', false);
            actionButton.addEventListener(eventType, ev => LootSheetNPC5eHelper.sendActionToSocket(this.token, ev));
        }

        // toggle infoboxes
        html.find('.help').hover(e => e.currentTarget.nextElementSibling.classList.toggle('hidden'));
    }

    /* -------------------------------------------- */

    /**
     * Handle merchant settings change
     * @private
     */
    async _inventorySettingChange(event, html) {
        event.preventDefault();

        const expectedKeys = ["rolltable", "shopQty", "itemQty", "itemQtyLimit", "clearInventory", "itemOnlyOnce"];
        let targetKey = event.target.name.split('.')[3];

        if (!expectedKeys.includes(targetKey)) {
            console.log(MODULE.ns + ` | Error changing stettings for "${targetKey}".`);
            return ui.notifications.error(`Error changing stettings for "${targetKey}".`);
        }

        if (targetKey == "clearInventory" || targetKey == "itemOnlyOnce") {
            console.log(MODULE.ns + " | " + targetKey + " set to " + event.target.checked);
            await this.actor.setFlag(MODULE.ns, targetKey, event.target.checked);
            return;
        }

        console.log(MODULE.ns + " | " + targetKey + " set to " + event.target.value);
        await this.actor.setFlag(MODULE.ns, targetKey, event.target.value);
    }

    /* -------------------------------------------- */

    /**
     * Handle inventory update
     *
     * @private
     */
    async _inventoryUpdate(event, html) {
        event.preventDefault();

        const rolltableUUID = this.actor.getFlag(MODULE.ns, "rolltable"),
                shopQtyFormula = this.token.actor.getFlag(MODULE.ns, MODULE.flags.shopQty) || "1",
                itemQtyLimitFormula = this.token.actor.getFlag(MODULE.ns, MODULE.flags.itemQtyLimit) || "0",
                clearInventory = this.token.actor.getFlag(MODULE.ns, MODULE.flags.clearInventory),
                betterRolltablesModule = {
                    ns: 'better-rolltables',
                    use: game.settings.get(MODULE.ns, MODULE.settings.keys.common.useBetterRolltables) || false
                };

        let rolltable = await fromUuid(rolltableUUID);
        if (!rolltable) return ui.notifications.error(`No Rollable Table found with uuid "${rolltableUUID}".`);

        if (clearInventory) {
            let currentItems = this.actor.data.items.map(i => i._id);
            await this.actor.deleteEmbeddedDocuments("Item", currentItems);
        }

        // populate via better-rolltables if it is installed and its activated in config
        if (
            betterRolltablesModule.use
            && rolltable.getFlag(betterRolltablesModule.ns, 'table-type')
            ) {
            const betterRolltablesAPI = game.modules.get(betterRolltablesModule.ns).public.API;
            let customRoll = new Roll(shopQtyFormula),
                itemLimitRoll = new Roll(itemQtyLimitFormula),
                options = {};

            customRoll.roll();
            itemLimitRoll.roll();

            options.customRole = customRoll.total;
            options.itemQtyLimit = itemLimitRoll.total;

            await betterRolltablesAPI.addLootToSelectedToken(
                    rolltable,
                    this.token,
                    options
                );

            return this.actor.sheet.render(true); //population should done, good bye 👋
        } else {
            // use built-in population method
            await tokenHelper.populateWithRolltable(rolltable, this.token);
        }
        await this.actor.sheet.close();
        return this.actor.sheet.render(true);
    }

    /**
     *
     * @param {*} sheetData
     */
    _setClasses(sheetData) {
        if (false && game.settings.get(MODULE.ns, "useCondensedLootsheet") || false && !sheetData.owner) {
            this.options.classes.push('lootsheet-condensed');
        }
    }

    /**
     *
     * @returns currently not in use, likely obsolet for now
     */
    _createRollTable() {
        let type = "weapon";

        game.packs.map(p => p.collection);

        const pack = game.packs.find(p => p.collection === "dnd5e.items");
        let i = 0;
        let output = [];

        pack.getIndex().then(index => index.forEach(function (arrayItem) {
            var x = arrayItem._id;
            //console.log(arrayItem);
            i++;
            pack.getEntity(arrayItem._id).then(packItem => {

                if (packItem.type === type) {

                    //console.log(packItem);

                    let newItem = {
                        "_id": packItem._id,
                        "flags": {},
                        "type": 1,
                        "text": packItem.name,
                        "img": packItem.img,
                        "collection": "Item",
                        "resultId": packItem._id,
                        "weight": 1,
                        "range": [
                            i,
                            i
                        ],
                        "drawn": false
                    };

                    output.push(newItem);

                }
            });
        }));

        console.log(output);
        return;
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
        // Actions
        const features = {
            weapons: {
                label: "Weapons",
                items: [],
                type: "weapon"
            },
            equipment: {
                label: "Equipment",
                items: [],
                type: "equipment"
            },
            consumables: {
                label: "Consumables",
                items: [],
                type: "consumable"
            },
            tools: {
                label: "Tools",
                items: [],
                type: "tool"
            },
            containers: {
                label: "Containers",
                items: [],
                type: "container"
            },
            loot: {
                label: "Loot",
                items: [],
                type: "loot"
            },

        };

        //console.log("Loot Sheet | Prepare Items");
        let items = LootSheetNPC5eHelper.getLootableItems(actorData.items);

        // Iterate through items, allocating to containers

        items = items.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        for (let i of items) {
            i.img = i.img || 'icons/svg/item-bag.svg';
            //console.log("Loot Sheet | item", i);

            // Features
            if (i.type === "weapon") features.weapons.items.push(i);
            else if (i.type === "equipment") features.equipment.items.push(i);
            else if (i.type === "consumable") features.consumables.items.push(i);
            else if (i.type === "tool") features.tools.items.push(i);
            else if (["container", "backpack"].includes(i.type)) features.containers.items.push(i);
            else if (i.type === "loot") features.loot.items.push(i);
            else features.loot.items.push(i);
        }

        actorData.actor.features = features;
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

export { LootSheetNPC5e };

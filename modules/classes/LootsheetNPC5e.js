import ActorSheet5eNPC from "/systems/dnd5e/module/actor/sheets/npc.js";
import Item5e from "/systems/dnd5e/module/item/entity.js";
// ⬆️ 5e core imports

import { MODULE } from "../config.js";
import { LootSheetNPC5eHelper } from "../helper/LootSheetNPC5eHelper.js";
import { PermissionHelper } from '../helper/PermissionHelper.js';
import tableHelper from "../helper/tableHelper.js";
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
        const sheetType = 'default',//(game.settings.get(MODULE.ns, "useCondensedLootsheet")) ? 'condensed' : 'default';
              path = "systems/dnd5e/templates/actors/";
        
        let templateList = [
            "modules/" + MODULE.ns + "/template/sheet.hbs",
            "modules/" + MODULE.ns + "/template/partials/list/" + sheetType + ".hbs",
            "modules/" + MODULE.ns + "/template/partials/header/" + sheetType + ".hbs"
        ];
        
        if(game.user.isGM) {
            templateList.push("modules/" + MODULE.ns + "/template/partials/sidebar/sidebar.hbs");
            templateList.push("modules/" + MODULE.ns + "/template/partials/sidebar/gm-settings/permissions.hbs");
        }

        loadTemplates(templateList);

        if (!game.user.isGM && this.actor.limited) return path + "limited-sheet.html";

        return "modules/" + MODULE.ns + "/template/sheet.hbs";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        mergeObject(options, {
            classes: ["dnd5e sheet actor npc npc-sheet loot-sheet-npc"],
            //resizable: !game.settings.get(MODULE.ns, "useCondensedLootsheet")            
        });
        
        return options;
    }

    /**
     * 
     * @returns {object} Data for sheet to render
     */
    async getData() {
        const typeKey = "lootsheettype",
            sheetData = super.getData(),
            gameWorldTables = await this._getGameWorldRolltables();

        this._setClasses(sheetData);
        this._prepareGMSettings(sheetData.actor);

        let sheetType = await this.actor.getFlag(MODULE.ns, typeKey),
            priceModifier = 1.0,
            itemContents = LootSheetNPC5eHelper._getLootableItems(sheetData.actor.items),
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
            totalWeight += (Object.values(this.actor.data.data.currency).map(x => parseInt(x)).sum() / 50).toNearest(0.01);

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
        sheetData.data.currency = LootSheetNPC5eHelper.convertCurrencyFromObject(sheetData.data.currency);
        return sheetData;
    }

    /**
     * WIP
     * 
     * @todo convert this to work
     * 
     * @return void
     */
    async _getGameWorldRolltables() {
        const rollTablePacks = game.packs.filter(
            (e) => e.documentName === "RollTable"
        );

        let availableRolltables = {};
        if (game.tables.size > 0) availableRolltables["World"] = [];
        for (const table of game.tables) {
            availableRolltables["World"].push({
                name: table.name,
                uuid: `RollTable.${table.id}`,
            });
        }
        for (const pack of rollTablePacks) {
            const idx = await pack.getIndex();
            availableRolltables[pack.metadata.label] = [];
            const tableString = `Compendium.${pack.collection}.`;
            for (let table of idx) {
                availableRolltables[pack.metadata.label].push({
                    name: table.name,
                    uuid: tableString + table._id,
                });
            }
        }

        return availableRolltables;
    }

    async _onSubmit(e) {
        e.preventDefault();
        let options = {},
            inventorySettings = document.querySelector('.inventory-settings');

        if (game.user.isGM && inventorySettings &&inventorySettings.contains(e.currentTarget)) {
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
            html.find('.permission-option a').click(ev => PermissionHelper.setPermissions(ev, this.actor));
            // Cycle Permissions for an indidual player.
            html.find('.permission-proficiency').click(ev => PermissionHelper._onCyclePermissionProficiency(ev, this.actor));

            // Price Modifier
            html.find('.price-modifier').click(ev => this._priceModifier(ev));
            html.find('.inventory-settings').change(ev => this._inventorySettingChange(ev));
            html.find('.update-inventory').click(ev => this._inventoryUpdate(ev));
        }

        // toggle infoboxes
        html.find('.help').hover(e => e.currentTarget.nextElementSibling.classList.toggle('hidden'));

        // Split Coins
        html.find('.split-coins').removeAttr('disabled').click(ev => LootSheetNPC5eHelper.distributeCoins(ev));

        // Buy Item
        html.find('.item-buy').click(ev => this._buyItem(ev));
        html.find('.item-buyall').click(ev => this._buyItem(ev, 1));
        

        // Loot Item
        if(game.settings.get(MODULE.ns, "useCondensedLootsheet")){
            html.find('.loot-trigger').click(ev => LootSheetNPC5eHelper._lootItem(this.token, ev, 1));
        } else {
            html.find('.item-loot').click(ev => LootSheetNPC5eHelper._lootItem(this.token, ev));
        }
        
        html.find('.item-lootall').click(ev => LootSheetNPC5eHelper._lootItem(this.token, ev, 1));

        // Loot Currency
        html.find('.loot-currency').click(ev => LootSheetNPC5eHelper.lootCoins(this.token, ev));

        // Loot All
        html.find('.loot-all').removeAttr('disabled').click(ev => this._lootAll(ev, html));

        // Change sheet type
        html.find('.sheet-type').change(ev => LootSheetNPC5eHelper._changeSheetType(ev, this.actor, html));
    }

    /* -------------------------------------------- */

    /**
     * Handle merchant settings change
     * @private
     */
    async _inventorySettingChange(event, html) {
        event.preventDefault();

        const expectedKeys = ["rolltable", "shopQty", "itemQty", "itemQtyLimit", "clearInventory", "itemOnlyOnce"];

        console.log(MODULE.ns + " | Merchant/Loot Config settings changed");

        let targetKey = event.target.name.split('.')[3];

        if (expectedKeys.indexOf(targetKey) === -1) {
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
                shopQtyFormula = this.actor.getFlag(MODULE.ns, "shopQty") || "1",
                itemQtyFormula = this.actor.getFlag(MODULE.ns, "itemQty") || "1",
                itemQtyLimit = this.actor.getFlag(MODULE.ns, "itemQtyLimit") || "0",
                clearInventory = this.actor.getFlag(MODULE.ns, "clearInventory"),
                itemOnlyOnce = this.actor.getFlag(MODULE.ns, "itemOnlyOnce"),
                reducedVerbosity = game.settings.get(MODULE.ns, "reduceUpdateVerbosity");

        let rolltable = await tableHelper._getRolltable(rolltableUUID);
        if (!rolltable) return ui.notifications.error(`No Rollable Table found with id "${rolltableUUID}".`);

        if (clearInventory) {
            let currentItems = this.actor.data.items.map(i => i._id);
            this.actor.deleteEmbeddedDocuments("Item", currentItems);
        }

        // populate via better-rolltables if it is installed and its activated in config
        if ((typeof game.betterTables !== "undefined") && game.settings.get(MODULE.ns, "useBetterRolltables")) {
            let customRoll = new Roll(shopQtyFormula);
            customRoll.roll();
            await game.betterTables.addLootToSelectedToken(
                    rolltable,
                    this.token,
                    {
                        customRole: customRoll.total,
                        itemLimit: itemQtyLimit
                    }
                );

            return this.actor.sheet.render(true); //population should done, good bye 👋 
        }

        let shopQtyRoll = new Roll(shopQtyFormula);
        shopQtyRoll.roll();

        if (itemOnlyOnce) {
            if (rolltable.results.length < shopQtyRoll.total) {
                return ui.notifications.error(`Cannot create an inventory with ${shopQtyRoll.total} unqiue entries if the rolltable only contains ${rolltable.results.length} items`);
            }
        }        

        console.log(MODULE.ns + ' | Updating Inventory for ' + this.actor.name);

        for (let i = 0; i < shopQtyRoll.total; i++) {
            const rollResult = await rolltable.roll();
            console.log(rollResult.results[0]);
            let newItem = null;

            if (rollResult.results[0].data.collection === "Item") {
                newItem = game.items.get(rollResult.results[0].data.resultId);
            } else {
                // Try to find it in the compendium
                const items = game.packs.get(rollResult.results[0].data.collection);
                newItem = await items.getDocument(rollResult.results[0].data.resultId);
            }

            if (!newItem || newItem === null) return ui.notifications.error(`No item found "${rollResult.results[0].resultId}".`);

            if (newItem.type === "spell") {
                newItem = await Item5e.createScrollFromSpell(newItem);
            }

            let itemQtyRoll = new Roll(itemQtyFormula),
                existingItem = this.actor.items.find(item => item.data.name == newItem.name);
            
            itemQtyRoll.roll();

            console.log(MODULE.ns + ` | Adding ${itemQtyRoll.total} x ${newItem.name}`);

            if (existingItem === undefined) {
                console.log(MODULE.ns + ` | ${newItem.name} does not exist.`);

                const createdItems = await this.actor.createEmbeddedDocuments("Item", [newItem.toObject()]);
                existingItem = createdItems[0];

                if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
                    await existingItem.update({ "data.quantity": itemQtyLimit });
                    if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
                } else {
                    await existingItem.update({ "data.quantity": itemQtyRoll.total });
                    if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
                }
            } else {
                console.log(MODULE.ns + ` | Item ${newItem.name} exists.`, existingItem);

                let newQty = Number(existingItem.data.data.quantity) + Number(itemQtyRoll.total);

                if (itemQtyLimit > 0 && Number(itemQtyLimit) === Number(existingItem.data.data.quantity)) {
                    if (!reducedVerbosity) ui.notifications.info(`${newItem.name} already at maximum quantity (${itemQtyLimit}).`);
                }
                else if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(newQty)) {
                    //console.log("Exceeds existing quantity, limiting");
                    await existingItem.update({ "data.quantity": itemQtyLimit });
                    if (!reducedVerbosity) ui.notifications.info(`Added additional quantity to ${newItem.name} to the specified maximum of ${itemQtyLimit}.`);
                } else {
                    await existingItem.update({ "data.quantity": newQty });
                    if (!reducedVerbosity) ui.notifications.info(`Added additional ${itemQtyRoll.total} quantity to ${newItem.name}.`);
                }
            }
        }

        return this.actor.sheet.render(true);
    }

    /**
     * 
     * @param {*} sheetData 
     */
    _setClasses(sheetData) {
        if (false && game.settings.get(MODULE.ns, "useCondensedLootsheet") || !sheetData.owner) {
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
     * 
     * @param {event} event 
     * @param {number|null} all 
     * 
     * uses PermissionHelper
     */
    _buyItem(event, all = null) {
        event.preventDefault();
        let targetGm = PermissionHelper.getTargetGM();

        if (!targetGm) return ui.notifications.error("No active GM on your scene, a GM must be online and on the same scene to purchase an item.");
        if (this.token === null) return ui.notifications.error(`You must purchase items from a token.`);
        if (!game.user.actorId) return ui.notifications.error(`No active character for user.`);

        const   itemId = event.currentTarget.dataset.ItemId || event.currentTarget.closest('.item').dataset.ItemId,
                targetItem = this.actor.getEmbeddedEntity("Item", itemId),
                item = { itemId: itemId, quantity: 1 };

        if (all || event.shiftKey) {
            item.quantity = targetItem.data.data.quantity;
        }

        const packet = {
            type: "buy",
            buyerId: game.user.actorId,
            tokenId: this.token.id,
            itemId: itemId,
            quantity: 1,
            processorId: targetGm.id
        };

        if (targetItem.data.data.quantity === item.quantity) {
            console.log(MODULE.ns, "Sending buy request to " + targetGm.name, packet);
            game.socket.emit(MODULE.socket, packet);
            return;
        }

        const d = new QuantityDialog((quantity) => {
            packet.quantity = quantity;
            console.log(MODULE.ns, "Sending buy request to " + targetGm.name, packet);
            game.socket.emit(MODULE.socket, packet);
        },
            {
                acceptLabel: "Purchase"
            }
        );
        d.render(true);
    }

    /* -------------------------------------------- */


    /* -------------------------------------------- */

    /**
     * Handle Loot all
     * @private
     */
    _lootAll(event, html) {
        event.preventDefault();
        console.log("Loot Sheet | Loot All clicked");
        this._lootCoins(event);

        let targetGm = PermissionHelper.getTargetGM();

        if (!targetGm) {
            return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to purchase an item.");
        }

        if (this.token === null) {
            return ui.notifications.error(`You must loot items from a token.`);
        }
        if (!game.user.actorId) {
            console.log("Loot Sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }

        const itemTargets = html.find('.item[data-item-id]');
        if (!itemTargets) {
            return;
        }

        const items = [];
        for (let i of itemTargets) {
            const itemId = i.getAttribute("data-item-id");
            const item = this.actor.getEmbeddedEntity("Item", itemId);
            items.push({ itemId: itemId, quantity: item.data.data.quantity });
        }
        if (items.length === 0) {
            return;
        }

        const packet = {
            type: "loot",
            looterId: game.user.actorId,
            tokenId: this.token.id,
            items: items,
            processorId: targetGm.id
        };

        console.log(MODULE.ns, "Sending loot request to " + targetGm.name, packet);
        game.socket.emit(MODULE.socket, packet);
    }

    /* -------------------------------------------- */

    /**
     * Handle price modifier
     * @private
     */
    async _priceModifier(event) {
        event.preventDefault();

        let priceModifier = await this.actor.getFlag(MODULE.ns, "priceModifier");
        if (typeof priceModifier !== 'number') priceModifier = 1.0;

        priceModifier = Math.round(priceModifier * 100);

        const maxModifier = game.settings.get(MODULE.ns, "maxPriceIncrease");

        var html = "<p>Use this slider to increase or decrease the price of all items in this inventory. <i class='fa fa-question-circle' title='This uses a percentage factor where 100% is the current price, 0% is 0, and 200% is double the price.'></i></p>";
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

    

    /* -------------------------------------------- */

    _hackydistributeCoins(containerActor) {
        //This is identical as the distributeCoins function defined in the init hook which for some reason can't be called from the above _distributeCoins method of the LootSheetNPC5E class. I couldn't be bothered to figure out why a socket can't be called as the GM... so this is a hack but it works.
        let actorData = containerActor.data
        let observers = [];
        let players = game.users.players;

        //console.log("Loot Sheet | actorData", actorData);
        // Calculate observers
        for (let player of players) {
            let playerPermission = LootSheetNPC5eHelper.getLootPermissionForPlayer(actorData, player);
            if (player != "default" && playerPermission >= 2) {
                //console.log("Loot Sheet | player", player);
                let actor = game.actors.get(player.data.character);
                //console.log("Loot Sheet | actor", actor);
                if (actor != null && (player.data.role === 1 || player.data.role === 2)) observers.push(actor);
            }
        }

        //console.log("Loot Sheet | observers", observers);
        if (observers.length === 0) return;

        // Calculate split of currency
        let currencySplit = duplicate(LootSheetNPC5eHelper.convertCurrencyFromObject(actorData.data.currency));
        //console.log("Loot Sheet | Currency data", currencySplit);

        // keep track of the remainder
        let currencyRemainder = {};

        for (let c in currencySplit) {
            if (observers.length) {
                // calculate remainder
                currencyRemainder[c] = (currencySplit[c] % observers.length);
                //console.log("Remainder: " + currencyRemainder[c]);

                currencySplit[c] = Math.floor(currencySplit[c] / observers.length);
            }
            else currencySplit[c] = 0;
        }

        // add currency to actors existing coins
        let msg = [];
        for (let u of observers) {
            //console.log("Loot Sheet | u of observers", u);
            if (u === null) continue;

            msg = [];
            let currency = LootSheetNPC5eHelper.convertCurrencyFromObject(u.data.data.currency),
                newCurrency = duplicate(LootSheetNPC5eHelper.convertCurrencyFromObject(u.data.data.currency));

            //console.log("Loot Sheet | Current Currency", currency);

            for (let c in currency) {
                // add msg for chat description
                if (currencySplit[c]) {
                    //console.log("Loot Sheet | New currency for " + c, currencySplit[c]);
                    msg.push(` ${currencySplit[c]} ${c} coins`)
                }
                if (currencySplit[c] != null) {
                    // Add currency to permitted actor
                    newCurrency[c] = parseInt(currency[c] || 0) + currencySplit[c];
                    u.update({
                        'data.currency': newCurrency
                    });
                }
            }

            // Remove currency from loot actor.
            let lootCurrency = LootSheetNPC5eHelper.convertCurrencyFromObject(containerActor.data.data.currency),
                zeroCurrency = {};

            for (let c in lootCurrency) {
                zeroCurrency[c] = {
                    'type': currencySplit[c].type,
                    'label': currencySplit[c].type,
                    'value': currencyRemainder[c]
                }
                containerActor.update({
                    "data.currency": zeroCurrency
                });
            }

            // Create chat message for coins received
            if (msg.length != 0) {
                let message = `${u.data.name} receives: `;
                message += msg.join(",");
                ChatMessage.create({
                    user: game.user._id,
                    speaker: {
                        actor: containerActor,
                        alias: containerActor.name
                    },
                    content: message
                });
            }
        }
    }

    /**
     * Organize and classify Items for Loot NPC sheets
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
        let items = LootSheetNPC5eHelper._getLootableItems(actorData.items);

        // Iterate through items, allocating to containers

        items = items.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        
        for (let i of items) {
            i.img = i.img || DEFAULT_TOKEN;
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
                player.lootPermissionDescription = lootPermissionInfo.description;
                playerData.push(player);
            }
        }

        // calculate the split of coins between all observers of the sheet.
        let currencySplit = duplicate(LootSheetNPC5eHelper.convertCurrencyFromObject(actorData.data.currency));
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
        loot.playersPermissionDescription = PermissionHelper.getPermissionInfo(commonPlayersPermission).description;
        actorData.flags.loot = loot;
    }
}

export { LootSheetNPC5e };
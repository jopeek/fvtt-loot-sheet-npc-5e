import SwadeCurrencyCalculator from "./systems/SwadeCurrencyCalculator.js";
import CurrencyCalculator from "./systems/CurrencyCalculator.js";


class MerchantSheetNPCHelper
{
    /**
     * Retrieve the loot permission for a player, given the current actor data.
     *
     * It first tries to get an entry from the actor's permissions, if none is found it uses default, otherwise returns 0.
     *
     */
    static getMerchantPermissionForPlayer(actorData, player) {
        let defaultPermission = actorData.permission.default;
        if (player.data._id in actorData.permission)
        {
            //console.log("Merchant sheet | Found individual actor permission");
            return actorData.permission[player.data._id];
            //console.log("Merchant sheet | assigning " + actorData.permission[player.data._id] + " permission to hidden field");
        }
        else if (typeof defaultPermission !== "undefined")
        {
            //console.log("Merchant sheet | default permissions", actorData.permission.default);
            return defaultPermission;
        }
        else
        {
            return 0;
        }
    }
}

class QuantityDialog extends Dialog {
    constructor(callback, options) {
        if (typeof (options) !== "object") {
            options = {};
        }

        let applyChanges = false;
        super({
            title: "Quantity",
            content: `
            <form>
                <div class="form-group">
                    <label>Quantity:</label>
                    <input type=number min="1" id="quantity" name="quantity" value="1">
                </div>
            </form>`,
            buttons: {
                yes: {
                    icon: "<i class='fas fa-check'></i>",
                    label: options.acceptLabel ? options.acceptLabel : "Accept",
                    callback: () => applyChanges = true
                },
                no: {
                    icon: "<i class='fas fa-times'></i>",
                    label: "Cancel"
                },
            },
            default: "yes",
            close: () => {
                if (applyChanges) {
                    var quantity = document.getElementById('quantity').value

                    if (isNaN(quantity)) {
                        console.log("Merchant sheet | Item quantity invalid");
                        return ui.notifications.error(`Item quantity invalid.`);
                    }

                    callback(quantity);

                }
            }
        });
    }
}

class MerchantSheetNPC extends ActorSheet {

    static SOCKET = "module.merchantsheetnpc";

    get template() {
        // adding the #equals and #unequals handlebars helper
        Handlebars.registerHelper('equals', function (arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('unequals', function (arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('merchantsheetprice', function (basePrice, modifier) {
            console.log ("Merchant sheet | basePrice: "+ basePrice + " modifier: " + modifier)
            return (Math.round(basePrice * modifier * 100) / 100).toLocaleString('en');
        });

        Handlebars.registerHelper('merchantsheetstackweight', function (weight, qty) {
            let showStackWeight = game.settings.get("merchantsheetnpc", "showStackWeight");
            if (showStackWeight) {
                return `/${(weight * qty).toLocaleString('en')}`;
            }
            else {
                return ""
            }

        });

        Handlebars.registerHelper('merchantsheetweight', function (weight) {
            return (Math.round(weight * 1e5) / 1e5).toString();
        });

        const path = "./module/templates/actors/";
        if (!game.user.isGM && this.actor.limited) return path + "limited-sheet.html";
        return "modules/merchantsheetnpc/template/npc-sheet.html";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        mergeObject(options, {
            classes: ["sheet actor npc npc-sheet merchant-sheet-npc"],
            width: 890,
            height: 750
        });
        return options;
    }

    async getData() {
        const sheetData = super.getData();

        // Prepare GM Settings
        this._prepareGMSettings(sheetData.actor);

        // Prepare isGM attribute in sheet Data

        //console.log("game.user: ", game.user);
        if (game.user.isGM) sheetData.isGM = true;
        else sheetData.isGM = false;
        //console.log("sheetData.isGM: ", sheetData.isGM);
        console.log(this.actor);


        let priceModifier = 1.0;
        priceModifier = await this.actor.getFlag("merchantsheetnpc", "priceModifier");
        if (!priceModifier) await this.actor.setFlag("merchantsheetnpc", "priceModifier", 1.0);
        priceModifier = await this.actor.getFlag("merchantsheetnpc", "priceModifier");

        let stackModifier = 20;
        stackModifier = await this.actor.getFlag("merchantsheetnpc", "stackModifier");
        if (!stackModifier) await this.actor.setFlag("merchantsheetnpc", "stackModifier", 20);
        stackModifier = await this.actor.getFlag("merchantsheetnpc", "stackModifier");

        let totalWeight = 0;
        this.actor.data.items.forEach((item)=>totalWeight += Math.round((item.data.quantity * item.data.weight * 100) / 100));

        let totalPrice = 0;
        this.actor.data.items.forEach((item)=>totalPrice += Math.round((item.data.quantity * item.data.price * priceModifier * 100) / 100));

        let totalQuantity = 0;
        this.actor.data.items.forEach((item)=>totalQuantity += Math.round((item.data.quantity * 100) / 100));

        sheetData.totalItems = this.actor.data.items.length;
        sheetData.totalWeight = totalWeight.toLocaleString('en');
        sheetData.totalPrice = totalPrice.toLocaleString('en') + " gp";
        sheetData.totalQuantity = totalQuantity;
        sheetData.priceModifier = priceModifier;
        sheetData.stackModifier = stackModifier;
        sheetData.rolltables = game.tables.entities;
        sheetData.items = this.actor.data.items;

        // Return data for rendering
        return sheetData;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * Activate event listeners using the prepared sheet HTML
     * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
     */
    activateListeners(html) {
        super.activateListeners(html);
            // Toggle Permissions
        html.find('.permission-proficiency').click(ev => this._onCyclePermissionProficiency(ev));
        html.find('.permission-proficiency-bulk').click(ev => this._onCyclePermissionProficiencyBulk(ev));

        // Price Modifier
        html.find('.price-modifier').click(ev => this._priceModifier(ev));
        html.find('.stack-modifier').click(ev => this._stackModifier(ev));

        html.find('.merchant-settings').change(ev => this._merchantSettingChange(ev));
        html.find('.update-inventory').click(ev => this._merchantInventoryUpdate(ev));

        // Split Coins
        html.find('.split-coins').removeAttr('disabled').click(ev => this._distributeCoins(ev));

        // Buy Item
        html.find('.item-buy').click(ev => this._buyItem(ev));
        html.find('.item-buystack').click(ev => this._buyItem(ev, 1));


        // Roll Table
        //html.find('.sheet-type').change(ev => this._changeSheetType(ev, html));

    }

    /* -------------------------------------------- */

    /**
     * Handle merchant settings change
     * @private
     */
    async _merchantSettingChange(event, html) {
        event.preventDefault();
        console.log("Merchant sheet | Merchant settings changed");

        const moduleNamespace = "merchantsheetnpc";
        const expectedKeys = ["rolltable", "shopQty", "itemQty", "itemQtyLimit", "clearInventory", "itemOnlyOnce"];

        let targetKey = event.target.name.split('.')[3];


        if (expectedKeys.indexOf(targetKey) === -1) {
            console.log(`Merchant sheet | Error changing stettings for "${targetKey}".`);
            return ui.notifications.error(`Error changing stettings for "${targetKey}".`);
        }

        if (targetKey == "clearInventory" || targetKey == "itemOnlyOnce") {
            console.log(targetKey + " set to " + event.target.checked);
            await this.actor.setFlag(moduleNamespace, targetKey, event.target.checked);
        } else if (event.target.value) {
            console.log(targetKey + " set to " + event.target.value);
            console.log("A");
            await this.actor.setFlag(moduleNamespace, targetKey, event.target.value);
        } else {
            console.log(targetKey + " set to " + event.target.value);
            console.log("B");
            await this.actor.unsetFlag(moduleNamespace, targetKey, event.target.value);
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle merchant inventory update
     * @private
     */
    async _merchantInventoryUpdate(event, html) {
        event.preventDefault();

        const moduleNamespace = "merchantsheetnpc";
        const rolltableName = this.actor.getFlag(moduleNamespace, "rolltable");
        const shopQtyFormula = this.actor.getFlag(moduleNamespace, "shopQty") || "1";
        const itemQtyFormula = this.actor.getFlag(moduleNamespace, "itemQty") || "1";
        const itemQtyLimit = this.actor.getFlag(moduleNamespace, "itemQtyLimit") || "0";
        const clearInventory = this.actor.getFlag(moduleNamespace, "clearInventory");
        const itemOnlyOnce = this.actor.getFlag(moduleNamespace, "itemOnlyOnce");
        const reducedVerbosity = game.settings.get("merchantsheetnpc", "reduceUpdateVerbosity");

        let shopQtyRoll = new Roll(shopQtyFormula);
        shopQtyRoll.roll();

        let rolltable = game.tables.getName(rolltableName);
        if (!rolltable) {
            // console.log(`Merchant sheet | No Rollable Table found with name "${rolltableName}".`);
            return ui.notifications.error(`No Rollable Table found with name "${rolltableName}".`);
        }

        if (itemOnlyOnce) {
            if (rolltable.results.length < shopQtyRoll.total)  {
                return ui.notifications.error(`Cannot create a merchant with ${shopQtyRoll.total} unqiue entries if the rolltable only contains ${rolltable.results.length} items`);
            }
        }

        // console.log(rolltable);

        if (clearInventory) {

            let currentItems = this.actor.data.items.map(i => i._id);
            await this.actor.deleteEmbeddedEntity("OwnedItem", currentItems);
            // console.log(currentItems);
        }

        console.log(`Merchant sheet | Adding ${shopQtyRoll.result} new items`);

        if (!itemOnlyOnce) {
            for (let i = 0; i < shopQtyRoll.total; i++) {
                const rollResult = rolltable.roll();
                //console.log(rollResult);
                let newItem = null;

                if (rollResult.results[0].collection === "Item") {
                    newItem = game.items.get(rollResult.results[0].resultId);
                }
                else {
                    // Try to find it in the compendium
                    const items = game.packs.get(rollResult.results[0].collection);
                    // console.log(items);
                    // dnd5eitems.getIndex().then(index => console.log(index));
                    // let newItem = dnd5eitems.index.find(e => e.id === rollResult.results[0].resultId);
                    // items.getEntity(rollResult.results[0].resultId).then(i => console.log(i));
                    newItem = await items.getEntity(rollResult.results[0].resultId);
                }
                if (!newItem || newItem === null) {
                    // console.log(`Merchant sheet | No item found "${rollResult.results[0].resultId}".`);
                    return ui.notifications.error(`No item found "${rollResult.results[0].resultId}".`);
                }

                if (newItem.type === "spell") {
                    newItem = await Item5e.createScrollFromSpell(newItem)
                }

                let itemQtyRoll = new Roll(itemQtyFormula);
                itemQtyRoll.roll();
                console.log(`Merchant sheet | Adding ${itemQtyRoll.total} x ${newItem.name}`)

                // newItem.data.quantity = itemQtyRoll.result;

                let existingItem = this.actor.items.find(item => item.data.name == newItem.name);

                if (existingItem === null) {
                    await this.actor.createEmbeddedEntity("OwnedItem", newItem);
                    console.log(`Merchant sheet | ${newItem.name} does not exist.`);
                    existingItem = this.actor.items.find(item => item.data.name == newItem.name);

                    if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
                        await existingItem.update({ "data.quantity": itemQtyLimit });
                        if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
                    } else {
                        await existingItem.update({ "data.quantity": itemQtyRoll.total });
                        if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
                    }
                }
                else {
                    console.log(`Merchant sheet | Item ${newItem.name} exists.`);

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
        }
        else {
            // Get a list which contains indexes of all possible results

            const rolltableIndexes = []

            // Add one entry for each weight an item has
            for (let index in [...Array(rolltable.results.length).keys()]) {
                let numberOfEntries = rolltable.data.results[index].weight
                for (let i = 0; i < numberOfEntries; i++) {
                    rolltableIndexes.push(index);
                }
            }

            // Shuffle the list of indexes
            var currentIndex = rolltableIndexes.length, temporaryValue, randomIndex;

            // While there remain elements to shuffle...
            while (0 !== currentIndex) {

                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;

                // And swap it with the current element.
                temporaryValue = rolltableIndexes[currentIndex];
                rolltableIndexes[currentIndex] = rolltableIndexes[randomIndex];
                rolltableIndexes[randomIndex] = temporaryValue;
            }

            // console.log(`Rollables: ${rolltableIndexes}`)

            let indexesToUse = [];
            let numberOfAdditionalItems = 0;
            // Get the first N entries from our shuffled list. Those are the indexes of the items in the roll table we want to add
            // But because we added multiple entries per index to account for weighting, we need to increase our list length until we got enough unique items
            while (true)
            {
                let usedEntries = rolltableIndexes.slice(0, shopQtyRoll.total + numberOfAdditionalItems);
                // console.log(`Distinct: ${usedEntries}`);
                let distinctEntris = [...new Set(usedEntries)];

                if (distinctEntris.length < shopQtyRoll.total) {
                    numberOfAdditionalItems++;
                    // console.log(`numberOfAdditionalItems: ${numberOfAdditionalItems}`);
                    continue;
                }

                indexesToUse = distinctEntris
                // console.log(`indexesToUse: ${indexesToUse}`)
                break;
            }

            for (const index of indexesToUse)
            {
                let itemQtyRoll = new Roll(itemQtyFormula);
                itemQtyRoll.roll();

                let newItem = null

                if (rolltable.results[index].collection === "Item") {
                    newItem = game.items.get(rolltable.results[index].resultId);
                }
                else {
                    //Try to find it in the compendium
                    const items = game.packs.get(rolltable.results[index].collection);
                    newItem = await items.getEntity(rolltable.results[index].resultId);
                }
                if (!newItem || newItem === null) {
                    return ui.notifications.error(`No item found "${rolltable.results[index].resultId}".`);
                }

                if (newItem.type === "spell") {
                    newItem = await Item5e.createScrollFromSpell(newItem)
                }

                await this.actor.createEmbeddedEntity("OwnedItem", newItem);
                let existingItem = this.actor.items.find(item => item.data.name == newItem.name);

                if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
                    await existingItem.update({ "data.quantity": itemQtyLimit });
                    if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
                } else {
                    await existingItem.update({ "data.quantity": itemQtyRoll.total });
                    if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
                }
            }
        }
    }


    /* -------------------------------------------- */


    /* -------------------------------------------- */

    /**
     * Handle buy item
     * @private
     */
    _buyItem(event, stack = 0) {
        event.preventDefault();
        console.log("Merchant sheet | Buy Item clicked");

        let targetGm = null;
        game.users.forEach((u) => {
            if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
                targetGm = u;
            }
        });

        if (!targetGm) {
            return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to purchase an item.");
        }

        if (this.token === null) {
            return ui.notifications.error(`You must purchase items from a token.`);
        }
        if (!game.user.actorId) {
            console.log("Merchant sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }

        let itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
        let stackModifier = $(event.currentTarget).parents(".item").attr("data-item-stack");
        const item = this.actor.getEmbeddedEntity("OwnedItem", itemId);

        const packet = {
            type: "buy",
            buyerId: game.user.actorId,
            tokenId: this.token.id,
            itemId: itemId,
            quantity: 1,
            processorId: targetGm.id
        };

        if (stack || event.shiftKey) {
            if (item.data.quantity < stackModifier) {
                packet.quantity = item.data.quantity;
            } else {
                packet.quantity = stackModifier;
            }
            console.log("MerchantSheet", "Sending buy request to " + targetGm.name, packet);
            game.socket.emit(MerchantSheetNPC.SOCKET, packet);
            return;
        }

        if (item.data.quantity === packet.quantity) {
            console.log("MerchantSheet", "Sending buy request to " + targetGm.name, packet);
            game.socket.emit(MerchantSheetNPC.SOCKET, packet);
            return;
        }

        let d = new QuantityDialog((quantity) => {
                packet.quantity = quantity;
                console.log("MerchantSheet", "Sending buy request to " + targetGm.name, packet);
                game.socket.emit(MerchantSheetNPC.SOCKET, packet);
            },
            {
                acceptLabel: "Purchase"
            }
        );
        d.render(true);
    }


    /**
     * Handle price modifier
     * @private
     */
    async _priceModifier(event) {
        event.preventDefault();
        //console.log("Merchant sheet | Price Modifier clicked");
        //console.log(this.actor.isToken);

        let priceModifier = await this.actor.getFlag("merchantsheetnpc", "priceModifier");
        if (!priceModifier) priceModifier = 1.0;

        priceModifier = Math.round(priceModifier * 100);

        var html = "<p>Use this slider to increase or decrease the price of all items in this inventory. <i class='fa fa-question-circle' title='This uses a percentage factor where 100% is the current price, 0% is 0, and 200% is double the price.'></i></p>";
        html += '<p><input name="price-modifier-percent" id="price-modifier-percent" type="range" min="0" max="200" value="' + priceModifier + '" class="slider"></p>';
        html += '<p><label>Percentage:</label> <input type=number min="0" max="200" value="' + priceModifier + '" id="price-modifier-percent-display"></p>';
        html += '<script>var pmSlider = document.getElementById("price-modifier-percent"); var pmDisplay = document.getElementById("price-modifier-percent-display"); pmDisplay.value = pmSlider.value; pmSlider.oninput = function() { pmDisplay.value = this.value; }; pmDisplay.oninput = function() { pmSlider.value = this.value; };</script>';

        let d = new Dialog({
            title: "Price Modifier",
            content: html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Update",
                    callback: () => this.actor.setFlag("merchantsheetnpc", "priceModifier", document.getElementById("price-modifier-percent").value / 100)
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => console.log("Merchant sheet | Price Modifier Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Merchant sheet | Price Modifier Closed")
        });
        d.render(true);
    }

    /**
     * Handle stack modifier
     * @private
     */
    async _stackModifier(event) {
        event.preventDefault();
        //console.log("Merchant sheet | Price Modifier clicked");
        //console.log(this.actor.isToken);

        let stackModifier = await this.actor.getFlag("merchantsheetnpc", "stackModifier");
        if (!stackModifier) stackModifier = 20;

        var html = "<p>Use this slider to increase or decrease the price of all items in this inventory. <i class='fa fa-question-circle' title='This defines how much a stack buy is, where 20 means 20 times the item, 1 is one item, and 100 is 100 times the item.'></i></p>";
        html += '<p><input name="stack-modifier" id="stack-modifier" type="range" min="1" max="100" value="' + stackModifier + '" class="slider"></p>';
        html += '<p><label>Stack amount:</label> <input type=number min="1" max="100" value="' + stackModifier + '" id="stack-modifier-display"></p>';
        html += '<script>var pmSlider = document.getElementById("stack-modifier"); var pmDisplay = document.getElementById("stack-modifier-display"); pmDisplay.value = pmSlider.value; pmSlider.oninput = function() { pmDisplay.value = this.value; }; pmDisplay.oninput = function() { pmSlider.value = this.value; };</script>';

        let d = new Dialog({
            title: "Stack Modifier",
            content: html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Update",
                    callback: () => this.actor.setFlag("merchantsheetnpc", "stackModifier",  document.getElementById("stack-modifier").value / 1)
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => console.log("Merchant sheet | Stack Modifier Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Merchant sheet | Stack Modifier Closed")
        });
        d.render(true);
    }

    /* -------------------------------------------- */

    /**
     * Handle distribution of coins
     * @private
     */
    _distributeCoins(event) {
        event.preventDefault();
        //console.log("Merchant sheet | Split Coins clicked");

        let targetGm = null;
        game.users.forEach((u) => {
            if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
                targetGm = u;
            }
        });

        if (!targetGm) {
            return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to purchase an item.");
        }

        if (this.token === null) {
            return ui.notifications.error(`You must loot items from a token.`);
        }

        if (game.user.isGM) {
            //don't use socket
            let container = canvas.tokens.get(this.token.id);
            this._hackydistributeCoins(container.actor);
            return;
        }

        const packet = {
            type: "distributeCoins",
            looterId: game.user.actorId,
            tokenId: this.token.id,
            processorId: targetGm.id
        };
        console.log("LootSheet5e", "Sending distribute coins request to " + targetGm.name, packet);
        game.socket.emit(MerchantSheetNPC.SOCKET, packet);
    }

    _hackydistributeCoins(containerActor) {
        //This is identical as the distributeCoins function defined in the init hook which for some reason can't be called from the above _distributeCoins method of the LootSheetNPC5E class. I couldn't be bothered to figure out why a socket can't be called as the GM... so this is a hack but it works.
        let actorData = containerActor.data
        let observers = [];
        let players = game.users.players;

        //console.log("Merchant sheet | actorData", actorData);
        // Calculate observers
        for (let player of players) {
            let playerPermission = MerchantSheetNPCHelper.getMerchantPermissionForPlayer(actorData, player);
            if (player != "default" && playerPermission >= 2) {
                //console.log("Merchant sheet | player", player);
                let actor = game.actors.get(player.data.character);
                //console.log("Merchant sheet | actor", actor);
                if (actor !== null && (player.data.role === 1 || player.data.role === 2)) observers.push(actor);
            }
        }

        //console.log("Merchant sheet | observers", observers);
        if (observers.length === 0) return;

        // Calculate split of currency
        let currencySplit = duplicate(actorData.data.currency);
        //console.log("Merchant sheet | Currency data", currencySplit);

        // keep track of the remainder
        let currencyRemainder = {};

        for (let c in currencySplit) {
            if (observers.length) {
                // calculate remainder
                currencyRemainder[c] = (currencySplit[c].value % observers.length);
                //console.log("Remainder: " + currencyRemainder[c]);

                currencySplit[c].value = Math.floor(currencySplit[c].value / observers.length);
            }
            else currencySplit[c].value = 0;
        }

        // add currency to actors existing coins
        let msg = [];
        for (let u of observers) {
            //console.log("Merchant sheet | u of observers", u);
            if (u === null) continue;

            msg = [];
            let currency = u.data.data.currency,
                newCurrency = duplicate(u.data.data.currency);

            //console.log("Merchant sheet | Current Currency", currency);

            for (let c in currency) {
                // add msg for chat description
                if (currencySplit[c].value) {
                    //console.log("Merchant sheet | New currency for " + c, currencySplit[c]);
                    msg.push(` ${currencySplit[c].value} ${c} coins`)
                }
                if (currencySplit[c].value != null) {
                    // Add currency to permitted actor
                    newCurrency[c] = parseInt(currency[c] || 0) + currencySplit[c].value;
                    u.update({
                        'data.currency': newCurrency
                    });
                }
            }

            // Remove currency from loot actor.
            let lootCurrency = containerActor.data.data.currency,
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

    /* -------------------------------------------- */

    /**
     * Handle cycling permissions
     * @private
     */
    _onCyclePermissionProficiency(event) {

        event.preventDefault();

        //console.log("Merchant sheet | this.actor.data.permission", this.actor.data.permission);


        let actorData = this.actor.data;


        let field = $(event.currentTarget).siblings('input[type="hidden"]');

        let level = parseFloat(field.val());
        if (typeof level === undefined) level = 0;

        //console.log("Merchant sheet | current level " + level);

        const levels = [0, 3, 2]; //const levels = [0, 2, 3];

        let idx = levels.indexOf(level),
            newLevel = levels[(idx === levels.length - 1) ? 0 : idx + 1];

        //console.log("Merchant sheet | new level " + newLevel);

        let playerId = field[0].name;

        //console.log("Merchant sheet | Current actor: " + playerId);

        this._updatePermissions(actorData, playerId, newLevel, event);

        this._onSubmit(event);
    }

    /* -------------------------------------------- */

    /**
     * Handle cycling bulk permissions
     * @private
     */
    _onCyclePermissionProficiencyBulk(event) {
        event.preventDefault();

        let actorData = this.actor.data;

        let field = $(event.currentTarget).parent().siblings('input[type="hidden"]');
        let level = parseFloat(field.val());
        if (typeof level === undefined || level === 999) level = 0;

        const levels = [0, 3, 2]; //const levels = [0, 2, 3];

        let idx = levels.indexOf(level),
            newLevel = levels[(idx === levels.length - 1) ? 0 : idx + 1];

        let users = game.users.entities;

        let currentPermissions = duplicate(actorData.permission);
        for (let u of users) {
            if (u.data.role === 1 || u.data.role === 2) {
                currentPermissions[u._id] = newLevel;
            }
        }
        const merchantPermissions = new PermissionControl(this.actor);
        merchantPermissions._updateObject(event, currentPermissions)

        this._onSubmit(event);
    }

    _updatePermissions(actorData, playerId, newLevel, event) {
        // Read player permission on this actor and adjust to new level
        let currentPermissions = duplicate(actorData.permission);
        currentPermissions[playerId] = newLevel;
        // Save updated player permissions
        const merchantPermissions = new PermissionControl(this.actor);
        merchantPermissions._updateObject(event, currentPermissions);
    }

    /* -------------------------------------------- */

    /**
     * Organize and classify Items for Loot NPC sheets
     * @private
     */
    _prepareItems(actorData) {

        //console.log("Merchant sheet | Prepare Features");
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

        console.log("Merchant sheet | Prepare Items");
        // Iterate through items, allocating to containers
        let items = actorData.items;
        items = items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        for (let i of items) {
            i.img = i.img || DEFAULT_TOKEN;
            //console.log("Merchant sheet | item", i);

            // Features
            if (i.type === "weapon") features.weapons.items.push(i);
            else if (i.type === "equipment") features.equipment.items.push(i);
            else if (i.type === "consumable") features.consumables.items.push(i);
            else if (i.type === "tool") features.tools.items.push(i);
            else if (["container", "backpack"].includes(i.type)) features.containers.items.push(i);
            else if (i.type === "loot") features.loot.items.push(i);
            else features.loot.items.push(i);
        }

        // Assign and return
        //actorData.features = features;
        actorData.actor.features = features;
        console.log(this.actor.features);
    }

    /* -------------------------------------------- */


    /**
     * Get the font-awesome icon used to display the permission level.
     * @private
     */
    _getPermissionIcon(level) {
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
    _getPermissionDescription(level) {
        const description = {
            0: "None (cannot access sheet)",
            2: "Observer (access to sheet but can only purchase items if merchant sheet type)",
            3: "Owner (can access items and share coins)",
            999: "Change all permissions"
        };
        return description[level];
    }


    /* -------------------------------------------- */

    /**
     * Prepares GM settings to be rendered by the Merchant sheet.
     * @private
     */
    _prepareGMSettings(actorData) {
        const playerData = [],
            observers = [];

        let players = game.users.players;
        let commonPlayersPermission = -1;

        //console.log("Merchant sheet _prepareGMSettings | actorData.permission", actorData.permission);

        for (let player of players)
        {
            console.log("Merchant sheet | Checking user " + player.data.name, player);

            // get the name of the primary actor for a player
            const actor = game.actors.get(player.data.character);
            console.log("Merchant sheet | Checking actor", actor);

            if (actor) {
                player.actor = actor.data.name;
                player.actorId = actor.data._id;
                player.playerId = player.data._id;

                player.merchantPermission = MerchantSheetNPCHelper.getMerchantPermissionForPlayer(actorData, player);

                if (player.merchantPermission >= 2 && !observers.includes(actor.data._id))
                {
                    observers.push(actor.data._id);
                }

                //Set icons and permission texts for html
                //console.log("Merchant sheet | merchantPermission", player.merchantPermission);
                if (commonPlayersPermission < 0) {
                    commonPlayersPermission = player.merchantPermission;
                } else if (commonPlayersPermission !== player.merchantPermission) {
                    commonPlayersPermission = 999;
                }

                player.icon = this._getPermissionIcon(player.merchantPermission);
                player.merchantPermissionDescription = this._getPermissionDescription(player.merchantPermission);
                playerData.push(player);
            }
        }

        let merchant = {}
        merchant.players = playerData;
        merchant.observerCount = observers.length;
        merchant.playersPermission = commonPlayersPermission;
        merchant.playersPermissionIcon = this._getPermissionIcon(commonPlayersPermission);
        merchant.playersPermissionDescription = this._getPermissionDescription(commonPlayersPermission);
        actorData.flags.merchant = merchant;
    }

}

//Register the Merchant sheet
Actors.registerSheet("core", MerchantSheetNPC, {
    types: ["npc"],
    makeDefault: false
});

var currencyCalculator = new CurrencyCalculator();


Hooks.once("init", () => {
    if (game.system.id === "swade") {
        // console.log("Swade");
        currencyCalculator = new SwadeCurrencyCalculator
    }
    currencyCalculator.price();

    Handlebars.registerHelper('ifeq', function (a, b, options) {
        if (a == b) { return options.fn(this); }
        return options.inverse(this);
    });

    game.settings.register("merchantsheetnpc", "convertCurrency", {
        name: "Convert currency after purchases?",
        hint: "If enabled, all currency will be converted to the highest denomination possible after a purchase. If disabled, currency will subtracted simply.",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register("merchantsheetnpc", "buyChat", {
        name: "Display chat message for purchases?",
        hint: "If enabled, a chat message will display purchases of items from the Merchant sheet.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("merchantsheetnpc", "showStackWeight", {
        name: "Show Stack Weight?",
        hint: "If enabled, shows the weight of the entire stack next to the item weight",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register("merchantsheetnpc", "reduceUpdateVerbosity", {
        name: "Reduce Update Shop Verbosity",
        hint: "If enabled, no notifications will be created every time an item is added to the shop.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    function chatMessage(speaker, owner, message, item) {
        if (game.settings.get("merchantsheetnpc", "buyChat")) {
            message = `
            <div class="chat-card item-card" data-actor-id="${owner._id}" data-item-id="${item._id}">
                <header class="card-header flexrow">
                    <img src="${item.img}" title="${item.name}" width="36" height="36">
                    <h3 class="item-name">${item.name}</h3>
                </header>

                <div class="message-content">
                    <p>` + message + `</p>
                </div>
            </div>
            `;
            ChatMessage.create({
                user: game.user._id,
                speaker: {
                    actor: speaker,
                    alias: speaker.name
                },
                content: message
            });
        }
    }


    function errorMessageToActor(target, message) {
        game.socket.emit(MerchantSheetNPC.SOCKET, {
            type: "error",
            targetId: target.id,
            message: message
        });
    }

    async function moveItems(source, destination, items) {
        const updates = [];
        const deletes = [];
        const additions = [];
        const destUpdates = [];
        const results = [];
        for (let i of items) {
            let itemId = i.itemId;
            let quantity = i.quantity;
            let item = source.getEmbeddedEntity("OwnedItem", itemId);

            // Move all items if we select more than the quantity.
            if (item.data.quantity < quantity) {
                quantity = item.data.quantity;
            }

            let newItem = duplicate(item);
            const update = { _id: itemId, "data.quantity": item.data.quantity - quantity };

            if (update["data.quantity"] === 0) {
                deletes.push(itemId);
            }
            else {
                updates.push(update);
            }

            newItem.data.quantity = quantity;
            results.push({
                item: newItem,
                quantity: quantity
            });
            let destItem = destination.data.items.find(i => i.name == newItem.name);
            if (destItem === undefined) {
                additions.push(newItem);
            } else {
                //console.log("Existing Item");
                destItem.data.quantity = Number(destItem.data.quantity) + Number(newItem.data.quantity);
                destUpdates.push(destItem);
            }
        }

        if (deletes.length > 0) {
            await source.deleteEmbeddedEntity("OwnedItem", deletes);
        }

        if (updates.length > 0) {
            await source.updateEmbeddedEntity("OwnedItem", updates);
        }

        if (additions.length > 0) {
            await destination.createEmbeddedEntity("OwnedItem", additions);
        }

        if (destUpdates.length > 0) {
            await destination.updateEmbeddedEntity("OwnedItem", destUpdates);
        }

        return results;
    }

    async function transaction(seller, buyer, itemId, quantity) {
        console.log(`Buying item: ${seller}, ${buyer}, ${itemId}, ${quantity}`);

        let sellItem = seller.getEmbeddedEntity("OwnedItem", itemId);

        // If the buyer attempts to buy more then what's in stock, buy all the stock.
        if (sellItem.data.quantity < quantity) {
            quantity = sellItem.data.quantity;
        }

        // On negative quantity we show an error
        if (quantity < 0) {
            errorMessageToActor(buyer, `Can not buy negative amounts of items.`);
            return;
        }

        // On 0 quantity skip everything to avoid error down the line
        if (quantity == 0) {
            return;
        }

        let sellerModifier = seller.getFlag("merchantsheetnpc", "priceModifier");
        let sellerStack = seller.getFlag("merchantsheetnpc", "stackModifier");
        if (!sellerModifier) sellerModifier = 1.0;
        if (!sellerStack && quantity > sellerStack) quantity = sellerStack;

        let itemCostInGold = Math.round(sellItem.data.price * sellerModifier * 100) / 100;

        itemCostInGold *= quantity;
        console.log(`ItemCost: ${itemCostInGold}`)
        // let currency = buyer.data.data.currency;
        // if (currency === 'Undefined') {
            let currency = buyer.data.data.details.currency
        // }
        let buyerFunds = duplicate(currency);

        console.log(`Funds before purchase: ${buyerFunds}`);

        // const conversionRates = {
        //     "pp": 1,
        //     "gp": CONFIG.DND5E.currencyConversion.gp.each,
        //     "ep": CONFIG.DND5E.currencyConversion.ep.each,
        //     "sp": CONFIG.DND5E.currencyConversion.sp.each,
        //     "cp": CONFIG.DND5E.currencyConversion.cp.each
        // };
        //
        // const compensationCurrency = {"pp": "gp", "gp": "ep", "ep": "sp", "sp": "cp"};
        //
        // let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        // console.log(`itemCostInGold : ${itemCostInGold}`);
        // console.log(`itemCostInPlatinum : ${itemCostInPlatinum}`);
        // console.log(`conversionRates["gp"] : ${conversionRates["gp"]}`);
        // console.log(`conversionRates["ep"] : ${conversionRates["ep"]}`);
        //
        // let buyerFundsAsPlatinum = buyerFunds["pp"];
        // buyerFundsAsPlatinum += buyerFunds["gp"] / conversionRates["gp"];
        // buyerFundsAsPlatinum += buyerFunds["ep"] / conversionRates["gp"] / conversionRates["ep"];
        // buyerFundsAsPlatinum += buyerFunds["sp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"];
        // buyerFundsAsPlatinum += buyerFunds["cp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"] / conversionRates["cp"];
        //
        // // console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);
        //
        if (itemCostInGold > buyerFunds) {
            errorMessageToActor(buyer, `Not enough funds to purchase item.`);
            return;
        }
        //
        // let convertCurrency = game.settings.get("merchantsheetnpc", "convertCurrency");
        //
        // if (convertCurrency) {
        //     buyerFundsAsPlatinum -= itemCostInPlatinum;
        //
        //     // Remove every coin we have
        //     for (let currency in buyerFunds) {
        //         buyerFunds[currency] = 0
        //     }
        //
        //     // Give us fractions of platinum coins, which will be smoothed out below
        //     buyerFunds["pp"] = buyerFundsAsPlatinum
        //
        // } else {
        //     // We just pay in partial platinum.
        //     // We dont care if we get partial coins or negative once because we compensate later
        //     buyerFunds["pp"] -= itemCostInPlatinum
        //
        //     // Now we exchange all negative funds with coins of lower value
        //     // We dont need to care about running out of money because we checked that earlier
        //     for (let currency in buyerFunds) {
        //         let amount = buyerFunds[currency]
        //         // console.log(`${currency} : ${amount}`);
        //         if (amount >= 0) continue;
        //
        //         // If we have ever so slightly negative cp, it is likely due to floating point error
        //         // We dont care and just give it to the player
        //         if (currency == "cp") {
        //             buyerFunds["cp"] = 0;
        //             continue;
        //         }
        //
        //         let compCurrency = compensationCurrency[currency]
        //
        //         buyerFunds[currency] = 0;
        //         buyerFunds[compCurrency] += amount * conversionRates[compCurrency]; // amount is a negative value so we add it
        //         // console.log(`Substracted: ${amount * conversionRates[compCurrency]} ${compCurrency}`);
        //     }
        // }
        buyerFunds = buyerFunds - itemCostInGold;
        // console.log(`Smoothing out`);
        // Finally we exchange partial coins with as little change as possible
        // for (let currency in buyerFunds) {
        //     let amount = buyerFunds[currency]
        //
        //     // console.log(`${currency} : ${amount}: ${conversionRates[currency]}`);
        //
        //     // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
        //     // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
        //     // If we would floor 15.99999999999918 everything explodes
        //     let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
        //     buyerFunds[currency] = newFund;
        //
        //     // console.log(`New Buyer funds ${currency}: ${buyerFunds[currency]}`);
        //     let compCurrency = compensationCurrency[currency]
        //
        //     // We dont care about fractions of CP
        //     if (currency != "cp") {
        //         // We calculate the amount of lower currency we get for the fraction of higher currency we have
        //         let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
        //         buyerFunds[compCurrency] += toAdd
        //         // console.log(`Added ${toAdd} to ${compCurrency} it is now ${buyerFunds[compCurrency]}`);
        //     }
        // }

        // Update buyer's funds
        buyer.update({ "data.currency": buyerFunds });
        buyer.update({ "data.details.currency": buyerFunds });

        console.log(`Funds after purchase: ${buyerFunds}`);

        let moved = await moveItems(seller, buyer, [{ itemId, quantity }]);

        for (let m of moved) {
            chatMessage(
                seller, buyer,
                `${buyer.name} purchases ${quantity} x ${m.item.name} for ${itemCostInGold}.`,
                m.item);
        }
    }

    function distributeCoins(containerActor) {
        let actorData = containerActor.data
        let observers = [];
        let players = game.users.players;

        //console.log("Merchant sheet | actorData", actorData);
        // Calculate observers
        for (let player of players) {
            let playerPermission = MerchantSheetNPCHelper.getMerchantPermissionForPlayer(actorData, player);
            if (player != "default" && playerPermission >= 2) {
                //console.log("Merchant sheet | player", player);
                let actor = game.actors.get(player.data.character);
                //console.log("Merchant sheet | actor", actor);
                if (actor !== null && (player.data.role === 1 || player.data.role === 2)) observers.push(actor);
            }
        }

        //console.log("Merchant sheet | observers", observers);
        if (observers.length === 0) return;

        // Calculate split of currency
        let currencySplit = duplicate(actorData.data.currency);
        //console.log("Merchant sheet | Currency data", currencySplit);

        // keep track of the remainder
        let currencyRemainder = {};

        for (let c in currencySplit) {
            if (observers.length) {
                // calculate remainder
                currencyRemainder[c] = (currencySplit[c].value % observers.length);
                //console.log("Remainder: " + currencyRemainder[c]);

                currencySplit[c].value = Math.floor(currencySplit[c].value / observers.length);
            }
            else currencySplit[c].value = 0;
        }

        // add currency to actors existing coins
        let msg = [];
        for (let u of observers) {
            //console.log("Merchant sheet | u of observers", u);
            if (u === null) continue;

            msg = [];
            let currency = u.data.data.currency,
                newCurrency = duplicate(u.data.data.currency);

            //console.log("Merchant sheet | Current Currency", currency);

            for (let c in currency) {
                // add msg for chat description
                if (currencySplit[c].value) {
                    //console.log("Merchant sheet | New currency for " + c, currencySplit[c]);
                    msg.push(` ${currencySplit[c].value} ${c} coins`)
                }

                // Add currency to permitted actor
                newCurrency[c] = parseInt(currency[c] || 0) + currencySplit[c].value;

                //console.log("Merchant sheet | New Currency", newCurrency);
                u.update({
                    'data.currency': newCurrency
                });
            }

            // Remove currency from loot actor.
            let lootCurrency = containerActor.data.data.currency,
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
    game.socket.on(MerchantSheetNPC.SOCKET, data => {
        console.log("Merchant sheet | Socket Message: ", data);
        if (game.user.isGM && data.processorId === game.user.id) {
            if (data.type === "buy") {
                let buyer = game.actors.get(data.buyerId);
                console.log(buyer)
                let seller = canvas.tokens.get(data.tokenId);

                if (buyer && seller && seller.actor) {
                    transaction(seller.actor, buyer, data.itemId, data.quantity);
                }
                else if (!seller) {
                    errorMessageToActor(buyer, "GM not available, the GM must on the same scene to purchase an item.")
                    ui.notifications.error("Player attempted to purchase an item on a different scene.");
                }
            }

            if (data.type === "distributeCoins") {
                let container = canvas.tokens.get(data.tokenId);
                if (!container || !container.actor) {
                    errorMessageToActor(looter, "GM not available, the GM must on the same scene to distribute coins.")
                    return ui.notifications.error("Player attempted to distribute coins on a different scene.");
                }
                distributeCoins(container.actor);
            }

        }
        if (data.type === "error" && data.targetId === game.user.actorId) {
            console.log("Merchant sheet | Transaction Error: ", data.message);
            return ui.notifications.error(data.message);
        }
    });


});

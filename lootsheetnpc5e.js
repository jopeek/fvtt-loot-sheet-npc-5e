import ActorSheet5eNPC from "../../systems/dnd5e/module/actor/sheets/npc.js";

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
                        console.log("Loot Sheet | Item quantity invalid");
                        return ui.notifications.error(`Item quantity invalid.`);
                    }

                    callback(quantity);

                }
            }
        });
    }
}

class LootSheet5eNPC extends ActorSheet5eNPC {

    static SOCKET = "module.lootsheetnpc5e";

    get template() {
        // adding the #equals and #unequals handlebars helper
        Handlebars.registerHelper('equals', function (arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('unequals', function (arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('lootsheetprice', function (basePrice, modifier) {
            return (Math.round(basePrice * modifier * 100) / 100).toLocaleString('en') + " gp";
        });

        const path = "systems/dnd5e/templates/actors/";
        if (!game.user.isGM && this.actor.limited) return path + "limited-sheet.html";
        return "modules/lootsheetnpc5e/template/npc-sheet.html";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        mergeObject(options, {
            classes: ["dnd5e sheet actor npc npc-sheet loot-sheet-npc"],
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

        let lootsheettype = await this.actor.getFlag("lootsheetnpc5e", "lootsheettype");
        if (!lootsheettype) await this.actor.setFlag("lootsheetnpc5e", "lootsheettype", "Loot");
        lootsheettype = await this.actor.getFlag("lootsheetnpc5e", "lootsheettype");


        let priceModifier = 1.0;
        if (lootsheettype === "Merchant") {
            priceModifier = await this.actor.getFlag("lootsheetnpc5e", "priceModifier");
            if (!priceModifier) await this.actor.setFlag("lootsheetnpc5e", "priceModifier", 1.0);
            priceModifier = await this.actor.getFlag("lootsheetnpc5e", "priceModifier");
        }

        let totalWeight = 0;
        this.actor.data.items.forEach((item)=>totalWeight += Math.round((item.data.quantity * item.data.weight * 100) / 100));

        let totalPrice = 0;
        this.actor.data.items.forEach((item)=>totalPrice += Math.round((item.data.quantity * item.data.price * priceModifier * 100) / 100));

        let totalQuantity = 0;
        this.actor.data.items.forEach((item)=>totalQuantity += Math.round((item.data.quantity * 100) / 100));

        sheetData.lootsheettype = lootsheettype;
        sheetData.totalItems = this.actor.data.items.length;
        sheetData.totalWeight = totalWeight.toLocaleString('en');
        sheetData.totalPrice = totalPrice.toLocaleString('en') + " gp";
        sheetData.totalQuantity = totalQuantity;
        sheetData.priceModifier = priceModifier;
        sheetData.rolltables = game.tables.entities;
        sheetData.lootCurrency = game.settings.get("lootsheetnpc5e", "lootCurrency");
        sheetData.lootAll = game.settings.get("lootsheetnpc5e", "lootAll");

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
        if (this.options.editable) {
            // Toggle Permissions
            html.find('.permission-proficiency').click(ev => this._onCyclePermissionProficiency(ev));
            html.find('.permission-proficiency-bulk').click(ev => this._onCyclePermissionProficiencyBulk(ev));

            // Price Modifier
            html.find('.price-modifier').click(ev => this._priceModifier(ev));

            html.find('.merchant-settings').change(ev => this._merchantSettingChange(ev));
            html.find('.update-inventory').click(ev => this._merchantInventoryUpdate(ev));
        }

        // Split Coins
        html.find('.split-coins').removeAttr('disabled').click(ev => this._distributeCoins(ev));

        // Buy Item
        html.find('.item-buy').click(ev => this._buyItem(ev));
        html.find('.item-buyall').click(ev => this._buyItem(ev, 1));

        // Loot Item
        html.find('.item-loot').click(ev => this._lootItem(ev));
        html.find('.item-lootall').click(ev => this._lootItem(ev, 1));

        // Loot Currency
        html.find('.currency-loot').click(ev => this._lootCoins(ev));

        // Loot All
        html.find('.loot-all').removeAttr('disabled').click(ev => this._lootAll(ev, html));

        // Sheet Type
        html.find('.sheet-type').change(ev => this._changeSheetType(ev, html));

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
        console.log("Loot Sheet | Merchant settings changed");

        const moduleNamespace = "lootsheetnpc5e";
        const expectedKeys = ["rolltable", "shopQty", "itemQty", "itemQtyLimit", "clearInventory"];

        let targetKey = event.target.name.split('.')[3];


        if (expectedKeys.indexOf(targetKey) === -1) {
            console.log(`Loot Sheet | Error changing stettings for "${targetKey}".`);
            return ui.notifications.error(`Error changing stettings for "${targetKey}".`);
        }

        if (targetKey == "clearInventory") {
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

        const moduleNamespace = "lootsheetnpc5e";
        const rolltableName = this.actor.getFlag(moduleNamespace, "rolltable");
        const shopQtyFormula = this.actor.getFlag(moduleNamespace, "shopQty") || "1";
        const itemQtyFormula = this.actor.getFlag(moduleNamespace, "itemQty") || "1";
        const itemQtyLimit = this.actor.getFlag(moduleNamespace, "itemQtyLimit") || "0";
        const clearInventory = this.actor.getFlag(moduleNamespace, "clearInventory");

        let rolltable = game.tables.getName(rolltableName);
        if (!rolltable) {
            //console.log(`Loot Sheet | No Rollable Table found with name "${rolltableName}".`);
            return ui.notifications.error(`No Rollable Table found with name "${rolltableName}".`);
        }

        //console.log(rolltable);

        if (clearInventory) {

            let currentItems = this.actor.data.items.map(i => i._id);
            await this.actor.deleteEmbeddedEntity("OwnedItem", currentItems);
            //console.log(currentItems);
        }

        let shopQtyRoll = new Roll(shopQtyFormula);

        shopQtyRoll.roll();
        console.log(`Loot Sheet | Adding ${shopQtyRoll.result} new items`);

        for (let i = 0; i < shopQtyRoll.total; i++) {
            const rollResult = rolltable.roll();
            //console.log(rollResult);
            let newItem = null;

            if (rollResult.results[0].collection === "Item") {
                newItem = game.items.get(rollResult.results[0].resultId);
            }
            else {
                //Try to find it in the compendium
                const items = game.packs.get(rollResult.results[0].collection);
                //console.log(items);
                //dnd5eitems.getIndex().then(index => console.log(index));
                //let newItem = dnd5eitems.index.find(e => e.id === rollResult.results[0].resultId);
                //items.getEntity(rollResult.results[0].resultId).then(i => console.log(i));
                newItem = await items.getEntity(rollResult.results[0].resultId);
            }
            if (!newItem || newItem === null) {
                //console.log(`Loot Sheet | No item found "${rollResult.results[0].resultId}".`);
                return ui.notifications.error(`No item found "${rollResult.results[0].resultId}".`);
            }

            let itemQtyRoll = new Roll(itemQtyFormula);
            itemQtyRoll.roll();
            console.log(`Loot Sheet | Adding ${itemQtyRoll.total} x ${newItem.name}`)

            //newItem.data.quantity = itemQtyRoll.result;

            let existingItem = this.actor.items.find(item => item.data.name == newItem.name);

            if (existingItem === null) {
                await this.actor.createEmbeddedEntity("OwnedItem", newItem);
                console.log(`Loot Sheet | ${newItem.name} does not exist.`);
                existingItem = this.actor.items.find(item => item.data.name == newItem.name);

                if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
                    await existingItem.update({ "data.quantity": itemQtyLimit });
                    ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
                } else {
                    await existingItem.update({ "data.quantity": itemQtyRoll.total });
                    ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
                }
            }
            else  {
                console.log(`Loot Sheet | Item ${newItem.name} exists.`);
                
                let newQty = Number(existingItem.data.data.quantity) + Number(itemQtyRoll.total);

                if (itemQtyLimit > 0 && Number(itemQtyLimit) === Number(existingItem.data.data.quantity)) {
                    ui.notifications.info(`${newItem.name} already at maximum quantity (${itemQtyLimit}).`);
                }
                else if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(newQty)) {
                    //console.log("Exceeds existing quantity, limiting");
                    await existingItem.update({ "data.quantity": itemQtyLimit });
                    ui.notifications.info(`Added additional quantity to ${newItem.name} to the specified maximum of ${itemQtyLimit}.`);
                } else {
                    await existingItem.update({ "data.quantity": newQty });
                    ui.notifications.info(`Added additional ${itemQtyRoll.total} quantity to ${newItem.name}.`);
                }
                
            }
            

        }
    }

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
     * Handle sheet type change
     * @private
     */
    async _changeSheetType(event, html) {
        event.preventDefault();
        console.log("Loot Sheet | Sheet Type changed", event);

        let currentActor = this.actor;

        let selectedIndex = event.target.selectedIndex;

        let selectedItem = event.target[selectedIndex].value;

        await currentActor.setFlag("lootsheetnpc5e", "lootsheettype", selectedItem);

    }

    /* -------------------------------------------- */

    /**
     * Handle buy item
     * @private
     */
    _buyItem(event, all = 0) {
        event.preventDefault();
        console.log("Loot Sheet | Buy Item clicked");

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
            console.log("Loot Sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }

        let itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
        const item = this.actor.getEmbeddedEntity("OwnedItem", itemId);

        const packet = {
            type: "buy",
            buyerId: game.user.actorId,
            tokenId: this.token.id,
            itemId: itemId,
            quantity: 1,
            processorId: targetGm.id
        };

        if (all || event.shiftKey) {
            packet.quantity = item.data.quantity;
        }

        if (item.data.quantity === packet.quantity) {
            console.log("LootSheet5e", "Sending buy request to " + targetGm.name, packet);
            game.socket.emit(LootSheet5eNPC.SOCKET, packet);
            return;
        }

        let d = new QuantityDialog((quantity) => {
            packet.quantity = quantity;
            console.log("LootSheet5e", "Sending buy request to " + targetGm.name, packet);
            game.socket.emit(LootSheet5eNPC.SOCKET, packet);
        },
            {
                acceptLabel: "Purchase"
            }
        );
        d.render(true);
    }

    /* -------------------------------------------- */

    /**
     * Handle Loot item
     * @private
     */
    _lootItem(event, all = 0) {
        event.preventDefault();
        console.log("Loot Sheet | Loot Item clicked");

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
        if (!game.user.actorId) {
            console.log("Loot Sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }

        const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
        const targetItem = this.actor.getEmbeddedEntity("OwnedItem", itemId);

        const item = { itemId: itemId, quantity: 1 };
        if (all || event.shiftKey) {
            item.quantity = targetItem.data.quantity;
        }

        const packet = {
            type: "loot",
            looterId: game.user.actorId,
            tokenId: this.token.id,
            items: [item],
            processorId: targetGm.id
        };

        if (targetItem.data.quantity === item.quantity) {
            console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
            game.socket.emit(LootSheet5eNPC.SOCKET, packet);
            return;
        }

        const d = new QuantityDialog((quantity) => {
            packet.items[0]['quantity'] = quantity;
            console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
            game.socket.emit(LootSheet5eNPC.SOCKET, packet);
        },
            {
                acceptLabel: "Loot"
            }
        );
        d.render(true);
    }

    /* -------------------------------------------- */

    /**
     * Handle Loot coins
     * @private
     */
    _lootCoins(event) {
        event.preventDefault();
        if (!game.settings.get("lootsheetnpc5e", "lootCurrency")) {
            return;
        }
        console.log("Loot Sheet | Loot Coins clicked");

        let targetGm = null;
        game.users.forEach((u) => {
            if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
                targetGm = u;
            }
        });

        if (!targetGm) {
            return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to loot coins.");
        }

        if (this.token === null) {
            return ui.notifications.error(`You must loot coins from a token.`);
        }
        if (!game.user.actorId) {
            console.log("Loot Sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }

        const packet = {
            type: "lootCoins",
            looterId: game.user.actorId,
            tokenId: this.token.id,
            processorId: targetGm.id
        };
        console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
        game.socket.emit(LootSheet5eNPC.SOCKET, packet);
    }

    /* -------------------------------------------- */

    /**
     * Handle Loot all
     * @private
     */
    _lootAll(event, html) {
        event.preventDefault();
        console.log("Loot Sheet | Loot All clicked");
        this._lootCoins(event);

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
            const item = this.actor.getEmbeddedEntity("OwnedItem", itemId);
            items.push({ itemId: itemId, quantity: item.data.quantity });
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

        console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
        game.socket.emit(LootSheet5eNPC.SOCKET, packet);
    }

    /* -------------------------------------------- */

    /**
     * Handle price modifier
     * @private
     */
    async _priceModifier(event) {
        event.preventDefault();
        //console.log("Loot Sheet | Price Modifier clicked");
        //console.log(this.actor.isToken);

        let priceModifier = await this.actor.getFlag("lootsheetnpc5e", "priceModifier");
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
                    callback: () => this.actor.setFlag("lootsheetnpc5e", "priceModifier", document.getElementById("price-modifier-percent").value / 100)
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => console.log("Loot Sheet | Price Modifier Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Loot Sheet | Price Modifier Closed")
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
        //console.log("Loot Sheet | Split Coins clicked");

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
        game.socket.emit(LootSheet5eNPC.SOCKET, packet);
    }

    _hackydistributeCoins(containerActor) {
        //This is identical as the distributeCoins function defined in the init hook which for some reason can't be called from the above _distributeCoins method of the LootSheetNPC5E class. I couldn't be bothered to figure out why a socket can't be called as the GM... so this is a hack but it works.

        let actorData = containerActor.data
        let observers = [];
        //console.log("Loot Sheet | actorData", actorData);
        // Calculate observers
        for (let u in actorData.permission) {
            if (u != "default" && actorData.permission[u] >= 2) {
                //console.log("Loot Sheet | u in actorData.permission", u);
                let player = game.users.get(u);
                //console.log("Loot Sheet | player", player);
                let actor = game.actors.get(player.data.character);
                //console.log("Loot Sheet | actor", actor);
                if (actor !== null && (player.data.role === 1 || player.data.role === 2)) observers.push(actor);
            }
        }

        //console.log("Loot Sheet | observers", observers);
        if (observers.length === 0) return;

        // Calculate split of currency
        let currencySplit = duplicate(actorData.data.currency);
        //console.log("Loot Sheet | Currency data", currencySplit);

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
            //console.log("Loot Sheet | u of observers", u);
            if (u === null) continue;

            msg = [];
            let currency = u.data.data.currency,
                newCurrency = duplicate(u.data.data.currency);

            //console.log("Loot Sheet | Current Currency", currency);

            for (let c in currency) {
                // add msg for chat description
                if (currencySplit[c].value) {
                    //console.log("Loot Sheet | New currency for " + c, currencySplit[c]);
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

        //console.log("Loot Sheet | this.actor.data.permission", this.actor.data.permission);


        let actorData = this.actor.data;


        let field = $(event.currentTarget).siblings('input[type="hidden"]');

        let level = parseFloat(field.val());
        if (typeof level === undefined) level = 0;

        //console.log("Loot Sheet | current level " + level);

        const levels = [0, 3, 2]; //const levels = [0, 2, 3];

        let idx = levels.indexOf(level),
            newLevel = levels[(idx === levels.length - 1) ? 0 : idx + 1];

        //console.log("Loot Sheet | new level " + newLevel);

        let playerId = field[0].name;

        //console.log("Loot Sheet | Current actor: " + playerId);

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
        const lootPermissions = new PermissionControl(this.actor);
        lootPermissions._updateObject(event, currentPermissions)

        this._onSubmit(event);
    }

    _updatePermissions(actorData, playerId, newLevel, event) {
        // Read player permission on this actor and adjust to new level
        let currentPermissions = duplicate(actorData.permission);
        currentPermissions[playerId] = newLevel;
        // Save updated player permissions
        const lootPermissions = new PermissionControl(this.actor);
        lootPermissions._updateObject(event, currentPermissions);
    }

    /* -------------------------------------------- */

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
        // Iterate through items, allocating to containers
        let items = actorData.items;
        items = items.sort(function (a, b) {
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

        // Assign and return
        //actorData.features = features;
        actorData.actor.features = features;
        //console.log(this.actor);
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
     * Prepares GM settings to be rendered by the loot sheet.
     * @private
     */
    _prepareGMSettings(actorData) {

        const players = [],
            observers = [];
        let users = game.users.entities;
        let commonPlayersPermission = -1;

        //console.log("Loot Sheet _prepareGMSettings | actorData.permission", actorData.permission);

        for (let u of users) {
            //console.log("Loot Sheet | Checking user " + u.data.name, u);

            //check if the user is a player 
            if (u.data.role === 1 || u.data.role === 2) {

                // get the name of the primary actor for a player
                const actor = game.actors.get(u.data.character);
                //console.log("Loot Sheet | Checking actor", actor);

                if (actor) {

                    u.actor = actor.data.name;
                    u.actorId = actor.data._id;
                    u.playerId = u.data._id;

                    //Check if there are default permissions to the actor
                    if (typeof actorData.permission.default !== "undefined") {

                        //console.log("Loot Sheet | default permissions", actorData.permission.default);

                        u.lootPermission = actorData.permission.default;

                        if (actorData.permission.default >= 2 && !observers.includes(actor.data._id)) {

                            observers.push(actor.data._id);
                        }

                    } else {

                        u.lootPermission = 0;
                        //console.log("Loot Sheet | assigning 0 permission to hidden field");
                    }

                    //if the player has some form of permission to the object update the actorData
                    if (u.data._id in actorData.permission && !observers.includes(actor.data._id)) {
                        //console.log("Loot Sheet | Found individual actor permission");

                        u.lootPermission = actorData.permission[u.data._id];
                        //console.log("Loot Sheet | assigning " + actorData.permission[u.data._id] + " permission to hidden field");

                        if (actorData.permission[u.data._id] >= 2) {
                            observers.push(actor.data._id);
                        }
                    }

                    //Set icons and permission texts for html
                    //console.log("Loot Sheet | lootPermission", u.lootPermission);
                    if (commonPlayersPermission < 0) {
                        commonPlayersPermission = u.lootPermission;
                    } else if (commonPlayersPermission !== u.lootPermission) {
                        commonPlayersPermission = 999;
                    }
                    u.icon = this._getPermissionIcon(u.lootPermission);
                    u.lootPermissionDescription = this._getPermissionDescription(u.lootPermission);
                    players.push(u);
                }
            }
        }

        // calculate the split of coins between all observers of the sheet.
        let currencySplit = duplicate(actorData.data.currency);
        for (let c in currencySplit) {
            if (observers.length)
                currencySplit[c].value = Math.floor(currencySplit[c].value / observers.length);
            else
                currencySplit[c] = 0
        }

        let loot = {}
        loot.players = players;
        loot.observerCount = observers.length;
        loot.currency = currencySplit;
        loot.playersPermission = commonPlayersPermission;
        loot.playersPermissionIcon = this._getPermissionIcon(commonPlayersPermission);
        loot.playersPermissionDescription = this._getPermissionDescription(commonPlayersPermission);
        actorData.flags.loot = loot;
    }


}

//Register the loot sheet
Actors.registerSheet("dnd5e", LootSheet5eNPC, {
    types: ["npc"],
    makeDefault: false
});


/**
 * Register a hook to convert any spell created on an actor with the LootSheet5eNPC sheet to a consumable scroll.
 */
Hooks.on('preCreateOwnedItem', (actor, item, data) => {

    // console.log("Loot Sheet | actor", actor);
    // console.log("Loot Sheet | item", item);
    // console.log("Loot Sheet | data", data);

    if (!actor) throw new Error(`Parent Actor ${actor._id} not found`);

    // Check if Actor is an NPC
    if (actor.data.type === "character") return;

    // If the actor is using the LootSheet5eNPC then check in the item is a spell and if so update the name.
    if ((actor.data.flags.core || {}).sheetClass === "dnd5e.LootSheet5eNPC") {
        if (item.type === "spell") {
            //console.log("Loot Sheet | dragged spell item", item);

            let changeScrollIcon = game.settings.get("lootsheetnpc5e", "changeScrollIcon");

            if (changeScrollIcon) item.img = "modules/lootsheetnpc5e/icons/Scroll" + item.data.level + ".png";

            //console.log("Loot Sheet | check changeScrollIcon", changeScrollIcon);

            item.name = "Scroll of " + item.name;
            item.type = "consumable";
            item.data.price = Math.round(10 * Math.pow(2.6, item.data.level));
            //console.log("Loot Sheet | price of scroll", item.data.price);
            item.data.autoDestroy = {
                label: "Destroy on Empty",
                type: "Boolean",
                value: true
            }
            item.data.autoUse = {
                label: "Consume on Use",
                type: "Boolean",
                value: true
            }
            item.data.charges = {
                label: "Charges",
                max: 1,
                type: "Number",
                value: 1
            }
            item.data.consumableType = {
                label: "Consumable Type",
                type: "String",
                value: "scroll"
            }
        }
    } else return;

});

Hooks.once("init", () => {

    Handlebars.registerHelper('ifeq', function (a, b, options) {
        if (a == b) { return options.fn(this); }
        return options.inverse(this);
    });

    game.settings.register("lootsheetnpc5e", "convertCurrency", {
        name: "Convert currency after purchases?",
        hint: "If enabled, all currency will be converted to the highest denomination possible after a purchase. If disabled, currency will subtracted simply.",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register("lootsheetnpc5e", "changeScrollIcon", {
        name: "Change icon for Spell Scrolls?",
        hint: "Changes the icon for spell scrolls to a scroll icon. If left unchecked, retains the spell's icon.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("lootsheetnpc5e", "buyChat", {
        name: "Display chat message for purchases?",
        hint: "If enabled, a chat message will display purchases of items from the loot sheet.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("lootsheetnpc5e", "lootCurrency", {
        name: "Loot currency?",
        hint: "If enabled, players will have the option to loot all currency to their character, in addition to splitting the currency between players.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("lootsheetnpc5e", "lootAll", {
        name: "Loot all?",
        hint: "If enabled, players will have the option to loot all items to their character, currency will follow the 'Loot Currency?' setting upon Loot All.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    function chatMessage(speaker, owner, message, item) {
        if (game.settings.get("lootsheetnpc5e", "buyChat")) {
            message = `
            <div class="dnd5e chat-card item-card" data-actor-id="${owner._id}" data-item-id="${item._id}">
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
        game.socket.emit(LootSheet5eNPC.SOCKET, {
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

    async function lootItems(container, looter, items) {
        let moved = await moveItems(container, looter, items);

        for (let m of moved) {
            chatMessage(
                container, looter,
                `${looter.name} looted ${m.quantity} x ${m.item.name}.`,
                m.item);
        }
    }

    async function transaction(seller, buyer, itemId, quantity) {
        let sellItem = seller.getEmbeddedEntity("OwnedItem", itemId);

        // If the buyer attempts to buy more then what's in stock, buy all the stock.
        if (sellItem.data.quantity < quantity) {
            quantity = sellItem.data.quantity;
        }

        let sellerModifier = seller.getFlag("lootsheetnpc5e", "priceModifier");
        if (!sellerModifier) sellerModifier = 1.0;

        let itemCostInGold = Math.round(sellItem.data.price * sellerModifier * 100) / 100;
        
        itemCostInGold *= quantity;
        // console.log(`ItemCost: ${itemCostInGold}`)
        let buyerFunds = duplicate(buyer.data.data.currency);

        console.log(`Funds before purchase: ${buyerFunds}`);

        const conversionRates = { 
            "pp": 1,
            "gp": CONFIG.DND5E.currencyConversion.gp.each, 
            "ep": CONFIG.DND5E.currencyConversion.ep.each,
            "sp": CONFIG.DND5E.currencyConversion.sp.each,
            "cp": CONFIG.DND5E.currencyConversion.cp.each
        };

        const compensationCurrency = {"pp": "gp", "gp": "ep", "ep": "sp", "sp": "cp"};
       
        let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        // console.log(`itemCostInGold : ${itemCostInGold}`);
        // console.log(`itemCostInPlatinum : ${itemCostInPlatinum}`);
        // console.log(`conversionRates["gp"] : ${conversionRates["gp"]}`);
        // console.log(`conversionRates["ep"] : ${conversionRates["ep"]}`);
        
        let buyerFundsAsPlatinum = buyerFunds["pp"];
        buyerFundsAsPlatinum += buyerFunds["gp"] / conversionRates["gp"];
        buyerFundsAsPlatinum += buyerFunds["ep"] / conversionRates["gp"] / conversionRates["ep"];
        buyerFundsAsPlatinum += buyerFunds["sp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"];
        buyerFundsAsPlatinum += buyerFunds["cp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"] / conversionRates["cp"];

        // console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);

        if (itemCostInPlatinum > buyerFundsAsPlatinum) {
            errorMessageToActor(buyer, `Not enough funds to purchase item.`);
            return;
        }

        let convertCurrency = game.settings.get("lootsheetnpc5e", "convertCurrency");

        if (convertCurrency) {
            buyerFundsAsPlatinum -= itemCostInPlatinum;

            // Remove every coin we have
            for (let currency in buyerFunds) {
                buyerFunds[currency] = 0
            }

            // Give us fractions of platinum coins, which will be smoothed out below
            buyerFunds["pp"] = buyerFundsAsPlatinum

        } else {
            // We just pay in partial platinum. 
            // We dont care if we get partial coins or negative once because we compensate later      
            buyerFunds["pp"] -= itemCostInPlatinum

            // Now we exchange all negative funds with coins of lower value
            // We dont need to care about running out of money because we checked that earlier
            for (let currency in buyerFunds) {
                let amount = buyerFunds[currency]
                // console.log(`${currency} : ${amount}`);
                if (amount >= 0) continue;
                
                // If we have ever so slightly negative cp, it is likely due to floating point error
                // We dont care and just give it to the player
                if (currency == "cp") {
                    buyerFunds["cp"] = 0;
                    continue;
                }

                let compCurrency = compensationCurrency[currency]

                buyerFunds[currency] = 0;
                buyerFunds[compCurrency] += amount * conversionRates[compCurrency]; // amount is a negative value so we add it
                // console.log(`Substracted: ${amount * conversionRates[compCurrency]} ${compCurrency}`);
            }
        }

        // console.log(`Smoothing out`);
        // Finally we exchange partial coins with as little change as possible
        for (let currency in buyerFunds) {
            let amount = buyerFunds[currency]

            // console.log(`${currency} : ${amount}: ${conversionRates[currency]}`);

            // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
            // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
            // If we would floor 15.99999999999918 everything explodes
            let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
            buyerFunds[currency] = newFund;

            // console.log(`New Buyer funds ${currency}: ${buyerFunds[currency]}`);
            let compCurrency = compensationCurrency[currency]

            // We dont care about fractions of CP
            if (currency != "cp") {
                // We calculate the amount of lower currency we get for the fraction of higher currency we have
                let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
                buyerFunds[compCurrency] += toAdd
                // console.log(`Added ${toAdd} to ${compCurrency} it is now ${buyerFunds[compCurrency]}`);
            }    
        }

        // Update buyer's funds
        buyer.update({ "data.currency": buyerFunds });

        console.log(`Funds after purchase: ${buyerFunds}`);

        let moved = await moveItems(seller, buyer, [{ itemId, quantity }]);

        for (let m of moved) {
            chatMessage(
                seller, buyer,
                `${buyer.name} purchases ${quantity} x ${m.item.name} for ${itemCostInGold}gp.`,
                m.item);
        }
    }

    function distributeCoins(containerActor) {
        let actorData = containerActor.data
        let observers = [];
        //console.log("Loot Sheet | actorData", actorData);
        // Calculate observers
        for (let u in actorData.permission) {
            if (u != "default" && actorData.permission[u] >= 2) {
                //console.log("Loot Sheet | u in actorData.permission", u);
                let player = game.users.get(u);
                //console.log("Loot Sheet | player", player);
                let actor = game.actors.get(player.data.character);
                //console.log("Loot Sheet | actor", actor);
                if (actor !== null && (player.data.role === 1 || player.data.role === 2)) observers.push(actor);
            }
        }

        //console.log("Loot Sheet | observers", observers);
        if (observers.length === 0) return;

        // Calculate split of currency
        let currencySplit = duplicate(actorData.data.currency);
        //console.log("Loot Sheet | Currency data", currencySplit);

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
            //console.log("Loot Sheet | u of observers", u);
            if (u === null) continue;

            msg = [];
            let currency = u.data.data.currency,
                newCurrency = duplicate(u.data.data.currency);

            //console.log("Loot Sheet | Current Currency", currency);

            for (let c in currency) {
                // add msg for chat description
                if (currencySplit[c].value) {
                    //console.log("Loot Sheet | New currency for " + c, currencySplit[c]);
                    msg.push(` ${currencySplit[c].value} ${c} coins`)
                }

                // Add currency to permitted actor
                newCurrency[c] = parseInt(currency[c] || 0) + currencySplit[c].value;

                //console.log("Loot Sheet | New Currency", newCurrency);
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

    function lootCoins(containerActor, looter) {
        let actorData = containerActor.data

        let sheetCurrency = actorData.data.currency;
        //console.log("Loot Sheet | Currency data", currency);

        // add currency to actors existing coins
        let msg = [];
        let currency = looter.data.data.currency,
            newCurrency = duplicate(looter.data.data.currency);

        //console.log("Loot Sheet | Current Currency", currency);

        for (let c in currency) {
            // add msg for chat description
            if (sheetCurrency[c].value) {
                //console.log("Loot Sheet | New currency for " + c, currencySplit[c]);
                msg.push(` ${sheetCurrency[c].value} ${c} coins`)
            }
            if (sheetCurrency[c].value != null) {
                // Add currency to permitted actor
                newCurrency[c] = parseInt(currency[c] || 0) + parseInt(sheetCurrency[c].value);
                looter.update({
                    'data.currency': newCurrency
                });
            }
        }

        // Remove currency from loot actor.
        let lootCurrency = containerActor.data.data.currency,
            zeroCurrency = {};

        for (let c in lootCurrency) {
            zeroCurrency[c] = {
                'type': sheetCurrency[c].type,
                'label': sheetCurrency[c].type,
                'value': 0
            }
            containerActor.update({
                "data.currency": zeroCurrency
            });
        }

        // Create chat message for coins received
        if (msg.length != 0) {
            let message = `${looter.data.name} receives: `;
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

    game.socket.on(LootSheet5eNPC.SOCKET, data => {
        console.log("Loot Sheet | Socket Message: ", data);
        if (game.user.isGM && data.processorId === game.user.id) {
            if (data.type === "buy") {
                let buyer = game.actors.get(data.buyerId);
                let seller = canvas.tokens.get(data.tokenId);

                if (buyer && seller && seller.actor) {
                    transaction(seller.actor, buyer, data.itemId, data.quantity);
                }
                else if (!seller) {
                    errorMessageToActor(buyer, "GM not available, the GM must on the same scene to purchase an item.")
                    ui.notifications.error("Player attempted to purchase an item on a different scene.");
                }
            }

            if (data.type === "loot") {
                let looter = game.actors.get(data.looterId);
                let container = canvas.tokens.get(data.tokenId);

                if (looter && container && container.actor) {
                    lootItems(container.actor, looter, data.items);
                }
                else if (!container) {
                    errorMessageToActor(looter, "GM not available, the GM must on the same scene to loot an item.")
                    ui.notifications.error("Player attempted to loot an item on a different scene.");
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

            if (data.type === "lootCoins") {
                let looter = game.actors.get(data.looterId);
                let container = canvas.tokens.get(data.tokenId);
                if (!container || !container.actor || !looter) {
                    errorMessageToActor(looter, "GM not available, the GM must on the same scene to loot coins.")
                    return ui.notifications.error("Player attempted to loot coins on a different scene.");
                }
                lootCoins(container.actor, looter);
            }
        }
        if (data.type === "error" && data.targetId === game.user.actorId) {
            console.log("Loot Sheet | Transaction Error: ", data.message);
            return ui.notifications.error(data.message);
        }
    });


});


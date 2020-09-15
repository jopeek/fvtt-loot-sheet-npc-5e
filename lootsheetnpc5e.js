import ActorSheet5eNPC from "../../systems/dnd5e/module/actor/sheets/npc.js";

class QuantityDialog extends Dialog {
    constructor(callback, options) {
        if (typeof (options) !== "object") {
            options = { };
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
        Handlebars.registerHelper('equals', function(arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('unequals', function(arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('lootsheetprice', function (basePrice, modifier) {
            return Math.round(basePrice * modifier * 100) / 100;
        });

        const path = "systems/dnd5e/templates/actors/";
        if (!game.user.isGM && this.actor.limited) return path + "limited-sheet.html";
        return "modules/lootsheetnpc5e/template/npc-sheet.html";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        mergeObject(options, {
            classes: ["dnd5e sheet actor npc npc-sheet loot-sheet-npc"],
            width: 850,
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
        //console.log(this.actor);
        
        let lootsheettype = await this.actor.getFlag("lootsheetnpc5e", "lootsheettype");
        if (!lootsheettype) await this.actor.setFlag("lootsheetnpc5e", "lootsheettype", "Loot");
        lootsheettype = await this.actor.getFlag("lootsheetnpc5e", "lootsheettype");

        
        let priceModifier = 1.0;
        if (lootsheettype === "Merchant") {
            priceModifier = await this.actor.getFlag("lootsheetnpc5e", "priceModifier");
            if (!priceModifier) await this.actor.setFlag("lootsheetnpc5e", "priceModifier", 1.0);
            priceModifier = await this.actor.getFlag("lootsheetnpc5e", "priceModifier");
        }

        sheetData.lootsheettype = lootsheettype;
        sheetData.priceModifier = priceModifier;
        sheetData.rolltables = game.tables.entities;

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

            // Split Coins
            html.find('.split-coins').click(ev => this._distributeCoins(ev));

            // Price Modifier
            html.find('.price-modifier').click(ev => this._priceModifier(ev));

            html.find('.merchant-settings').change(ev => this._merchantSettingChange(ev));
            html.find('.update-inventory').click(ev => this._merchantInventoryUpdate(ev));
        }

        // Buy Item
        html.find('.item-buy').click(ev => this._buyItem(ev));

        // Loot Item
        html.find('.item-loot').click(ev => this._lootItem(ev));

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
        const expectedKeys = ["rolltable", "shopQty", "itemQty"];

        let targetKey = event.target.name.split('.')[3];

        if (expectedKeys.indexOf(targetKey) === -1) {
            console.log(`Loot Sheet | Error changing stettings for "${targetKey}".`);
            return ui.notifications.error(`Error changing stettings for "${targetKey}".`);
        }

        if (event.target.value) {
            await this.actor.setFlag(moduleNamespace, targetKey, event.target.value);
        } else {
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

        let rolltable = game.tables.getName(rolltableName);
        if (!rolltable) {
            //console.log(`Loot Sheet | No Rollable Table found with name "${rolltableName}".`);
            return ui.notifications.error(`No Rollable Table found with name "${rolltableName}".`);
        }

        //console.log(rolltable);

        let clearInventory = game.settings.get("lootsheetnpc5e", "clearInventory");

        if (clearInventory) {
            
            let currentItems = this.actor.data.items.map(i => i._id);
            await this.actor.deleteEmbeddedEntity("OwnedItem", currentItems);
            //console.log(currentItems);
        }

        let shopQtyRoll = new Roll(shopQtyFormula);

        shopQtyRoll.roll();
        //console.log(`Loot Sheet | Adding ${shopQtyRoll.result} new items`);

        for (let i = 0; i < shopQtyRoll.result; i++) {
            const rollResult = rolltable.roll();
            //console.log(rollResult);
            let newItem = null;
            
            if (rollResult.results[0].collection === "Item") {
                newItem = game.items.get(rollResult.results[0].resultId);
            }
            else {
                //Try to find it in the compendium
                const items = game.packs.get(rollResult.results[0].collection);
                //dnd5eitems.getIndex().then(index => console.log(index));
                //let newItem = dnd5eitems.index.find(e => e.id === rollResult.results[0].resultId);
                items.getEntity(rollResult.results[0].resultId).then(i => console.log(i));
                newItem = await items.getEntity(rollResult.results[0].resultId);
            }
            if (!newItem || newItem === null) {
                //console.log(`Loot Sheet | No item found "${rollResult.results[0].resultId}".`);
                return ui.notifications.error(`No item found "${rollResult.results[0].resultId}".`);
            }

            let itemQtyRoll = new Roll(itemQtyFormula);
            itemQtyRoll.roll();
            //console.log(`Loot Sheet | Adding ${itemQtyRoll.result} x ${newItem.name}`)
            newItem.data.data.quantity = itemQtyRoll.result;

            await this.actor.createEmbeddedEntity("OwnedItem", newItem);
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
    _buyItem(event) {
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
        if (game.user.actorId) {
            let itemId = $(event.currentTarget).parents(".item").attr("data-item-id");

            let d = new QuantityDialog((quantity) => {
                    const packet = {
                        type: "buy",
                        buyerId: game.user.actorId,
                        tokenId: this.token.id,
                        itemId: itemId,
                        quantity: quantity,
                        processorId: targetGm.id
                    };
                    console.log("LootSheet5e", "Sending buy request to " + targetGm.name, packet);
                    game.socket.emit(LootSheet5eNPC.SOCKET, packet);
                },
                {
                    acceptLabel: "Purchase"
                }
            );
            d.render(true);
        } else {
            console.log("Loot Sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle Loot item
     * @private
     */
    _lootItem(event) {
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
        if (game.user.actorId) {
            let itemId = $(event.currentTarget).parents(".item").attr("data-item-id");

            let d = new QuantityDialog((quantity) => {
                    const packet = {
                        type: "loot",
                        looterId: game.user.actorId,
                        tokenId: this.token.id,
                        itemId: itemId,
                        quantity: quantity,
                        processorId: targetGm.id
                    };
                    console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
                    game.socket.emit(LootSheet5eNPC.SOCKET, packet);
                },
                {
                    acceptLabel: "Loot"
                }
            );
            d.render(true);
        } else {
            console.log("Loot Sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }
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
        html += '<p><input name="price-modifier-percent" id="price-modifier-percent" type="range" min="0" max="200" value="'+priceModifier+'" class="slider"></p>';
        html += '<p><label>Percentage:</label> <input type=number min="0" max="200" value="'+priceModifier+'" id="price-modifier-percent-display"></p>';
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

        let actorData = this.actor.data
        let owners = [];
        //console.log("Loot Sheet | actorData", actorData);
        // Calculate owners
        for (let u in actorData.permission) {
            if (u != "default" && actorData.permission[u] == 3) {
                //console.log("Loot Sheet | u in actorData.permission", u);
                let player = game.users.get(u);
                //console.log("Loot Sheet | player", player);
                let actor = game.actors.get(player.data.character);
                //console.log("Loot Sheet | actor", actor);
                if (actor !== null && (player.data.role === 1 || player.data.role === 2)) owners.push(actor);
            }
        }

        //console.log("Loot Sheet | owners", owners);
        if (owners.length === 0) return;

        // Calculate split of currency
        let currencySplit = duplicate(actorData.data.currency);
        //console.log("Loot Sheet | Currency data", currencySplit);
        
        // keep track of the remainder
        let currencyRemainder = {};

        for (let c in currencySplit) {
            if (owners.length) {                
                // calculate remainder
                currencyRemainder[c] = (currencySplit[c].value % owners.length);
                //console.log("Remainder: " + currencyRemainder[c]);

                currencySplit[c].value = Math.floor(currencySplit[c].value / owners.length);
            }
            else currencySplit[c].value = 0;
        }

        // add currency to actors existing coins
        let msg = [];
        for (let u of owners) {
            //console.log("Loot Sheet | u of owners", u);
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
                newCurrency[c] = currency[c] + currencySplit[c].value;

                //console.log("Loot Sheet | New Currency", newCurrency);
                u.update({
                    'data.currency': newCurrency
                });
            }

            // Remove currency from loot actor.
            let lootCurrency = this.actor.data.data.currency,
                zeroCurrency = {};

            for (let c in lootCurrency) {
                zeroCurrency[c] = {
                    'type': currencySplit[c].type,
                    'label': currencySplit[c].type,
                    'value': currencyRemainder[c]
                }
                this.actor.update({
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
                        actor: this.actor,
                        alias: this.actor.name
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
        for (let i of actorData.items) {
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
            3: '<i class="fas fa-check"></i>'
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
            3: "Owner (can access items and share coins)"
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
            owners = [];
        let users = game.users.entities;

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

                        if (actorData.permission.default === 3 && !owners.includes(actor.data._id)) {

                            owners.push(actor.data._id);
                        }
						
                    } else {
						
                        u.lootPermission = 0;
                        //console.log("Loot Sheet | assigning 0 permission to hidden field");
                    }

                    //if the player has some form of permission to the object update the actorData
                    if (u.data._id in actorData.permission && !owners.includes(actor.data._id)) {
                        //console.log("Loot Sheet | Found individual actor permission");

                        u.lootPermission = actorData.permission[u.data._id];
                        //console.log("Loot Sheet | assigning " + actorData.permission[u.data._id] + " permission to hidden field");

                        if (actorData.permission[u.data._id] === 3) {
                            owners.push(actor.data._id);
                        }
                    }

					//Set icons and permission texts for html
					//console.log("Loot Sheet | lootPermission", u.lootPermission);
                    u.icon = this._getPermissionIcon(u.lootPermission);
                    u.lootPermissionDescription = this._getPermissionDescription(u.lootPermission);
                    players.push(u);
                }
            }
        }

        // calculate the split of coins between all owners of the sheet.
        let currencySplit = duplicate(actorData.data.currency);
        for (let c in currencySplit) {
            if (owners.length)
                currencySplit[c].value = Math.floor(currencySplit[c].value / owners.length);
            else
                currencySplit[c] = 0
        }

        let loot = {}
        loot.players = players;
        loot.ownerCount = owners.length;
        loot.currency = currencySplit;
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
		default: true,
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
    
    game.settings.register("lootsheetnpc5e", "clearInventory", {
		  name: "Clear inventory?",
      hint: "If enabled, all existing items will be removed from the Loot Sheet before adding new items from the rollable table. If disabled, existing items will remain.",
      scope: "world",
      config: true,
      default: false,
      type: Boolean
    });


    function chatMessage (speaker, owner, message, item) {
        if (game.settings.get("lootsheetnpc5e", "buyChat")) {
            message =   `
            <div class="dnd5e chat-card item-card" data-actor-id="${owner._id}" data-item-id="${item._id}">
                <header class="card-header flexrow">
                    <img src="${item.img}" title="${item.name}" width="36" height="36">
                    <h3 class="item-name">${item.name}</h3>
                </header>

                <div class="card-content">
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

    function moveItem(source, destination, itemId, quantity) {
        let item = source.getEmbeddedEntity("OwnedItem", itemId);

        // Move all items if we select more than the quantity.
        if (item.data.quantity < quantity) {
            quantity = item.data.quantity;
        }

        let newItem = duplicate(item);
        const update = {_id: itemId, "data.quantity": item.data.quantity - quantity};

        if (update["data.quantity"] === 0) {
            source.deleteEmbeddedEntity("OwnedItem", itemId);
        }
        else {
            source.updateEmbeddedEntity("OwnedItem", update);
        }

        newItem.data.quantity = quantity;
        destination.createEmbeddedEntity("OwnedItem", newItem);

        return {
            item: newItem,
            quantity: quantity
        };

    }

    function lootItem(container, looter, itemId, quantity) {
        let moved = moveItem(container, looter, itemId, quantity);

        chatMessage(
            container, looter,
            `${looter.name} looted ${moved.quantity} x ${moved.item.name}.`,
            moved.item);

    }

    function transaction(seller, buyer, itemId, quantity) {
        let sellItem = seller.getEmbeddedEntity("OwnedItem", itemId);

        // If the buyer attempts to buy more then what's in stock, buy all the stock.
        if (sellItem.data.quantity < quantity) {
            quantity = sellItem.data.quantity;
        }

        let sellerModifier = seller.getFlag("lootsheetnpc5e", "priceModifier");
        if (!sellerModifier) sellerModifier = 1.0;

        let itemCost = Math.round(sellItem.data.price * sellerModifier * 100)  / 100;
        itemCost *= quantity;
        let buyerFunds = duplicate(buyer.data.data.currency);
        const conversionRate = { "pp": 10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01 };
        let buyerFundsAsGold = 0;

        for (let currency in buyerFunds) {
            buyerFundsAsGold += buyerFunds[currency] * conversionRate[currency];
        }

        if (itemCost > buyerFundsAsGold) {
            errorMessageToActor(buyer, `Not enough funds to purchase item.`);
            return;
        }
		
		let convertCurrency = game.settings.get("lootsheetnpc5e", "convertCurrency");
		
		if (convertCurrency) {
			buyerFundsAsGold -= itemCost;
			
			for (let currency in buyerFunds) {
				buyerFunds[currency] = Math.floor(buyerFundsAsGold / conversionRate[currency]);
				buyerFundsAsGold -= buyerFunds[currency] * conversionRate[currency];
			}
		} else {
			let itemCostSubtracted = itemCost;
			let giveChange = false;
			
			for (let currency in buyerFunds) {
				while (itemCostSubtracted >= conversionRate[currency] && buyerFunds[currency] > 0) {
					buyerFunds[currency] -= 1;
					itemCostSubtracted -= conversionRate[currency];
				}
				
				if (giveChange) {
					buyerFunds[currency] -= Math.round(itemCostSubtracted * 100) / 100;
					itemCostSubtracted -= itemCostSubtracted;
				}
				
				if (currency != "cp") {
					let nextKey = Object.keys(conversionRate)[Object.keys(conversionRate).indexOf(currency) +1];
					
					if (itemCostSubtracted % conversionRate[currency] != 0 && conversionRate[nextKey] < itemCostSubtracted && buyerFunds[nextKey] < itemCostSubtracted) {
						buyerFunds[currency] -= 1;
						itemCostSubtracted -= conversionRate[currency];
						giveChange = true;
					}
				}
			}
		}

        // Update buyer's gold from the buyer.
        buyer.update({"data.currency": buyerFunds});
        let moved = moveItem(seller, buyer, itemId, quantity);

        chatMessage(
            seller, buyer,
            `${buyer.name} purchases ${quantity} x ${moved.item.name} for ${itemCost}gp.`,
            moved.item);
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
                    lootItem(container.actor, looter, data.itemId, data.quantity);
                }
                else if (!container) {
                    errorMessageToActor(looter, "GM not available, the GM must on the same scene to loot an item.")
                    ui.notifications.error("Player attempted to loot an item on a different scene.");
                }
            }
        }
        if (data.type === "error" && data.targetId === game.user.actorId) {
            console.log("Loot Sheet | Transaction Error: ", data.message);
            return ui.notifications.error(data.message);
        }
    });


});


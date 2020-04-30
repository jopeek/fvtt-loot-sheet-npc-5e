import {
    ActorSheet5eNPC
} from "../../systems/dnd5e/module/actor/sheets/npc.js";

class LootSheet5eNPC extends ActorSheet5eNPC {

    get template() {
        // adding the #equals and #unequals handlebars helper
        Handlebars.registerHelper('equals', function(arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('unequals', function(arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
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

    getData() {
        const sheetData = super.getData();

        // Prepare GM Settings
        this._prepareGMSettings(sheetData.actor);

        // Prepare isGM attribute in sheet Data

        //console.log("game.user: ", game.user);
        if (game.user.isGM) sheetData.isGM = true;
        else sheetData.isGM = false;
        //console.log("sheetData.isGM: ", sheetData.isGM);

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
            if (this.actor.isToken) {
                html.find('.price-modifier').remove();
            } else {
                html.find('.price-modifier').click(ev => this._priceModifier(ev));
            }
        }

        // Buy Item
        html.find('.item-buy').click(ev => this._buyItem(ev));

    }

    /* -------------------------------------------- */

    /**
     * Handle buy item
     * @private
     */
    _buyItem(event) {
        event.preventDefault();
        console.log("Loot Sheet | Buy Item clicked");
        //console.log(this.actor);

        if (game.user.actorId) {
            let currentActor = game.actors.get(game.user.actorId);

            let itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
            let newItem = duplicate(this.actor.getEmbeddedEntity("OwnedItem", itemId));

            let applyChanges = false;
            let d = new Dialog({
                title: "Quantity",
                content: `
                <form>
                    <div class="form-group">
                        <label>Quantity:</label>
                        <input type="text" id="quantity" name="quantity" value="${newItem.data.quantity}">
                    </div>
                </form>
                `,
                buttons: {
                    yes: {
                        icon: "<i class='fas fa-check'></i>",
                        label: "Apply Changes",
                        callback: () => applyChanges = true
                    },
                    no: {
                        icon: "<i class='fas fa-times'></i>",
                        label: "Cancel Changes"
                    },
                },
                default: "yes",
                close: () => {
                    if (applyChanges) {
                        let quantity = document.getElementById('quantity').value;

                        if (isNaN(quantity)) {
                            console.log("Loot Sheet | Item quantity invalid");
                            return;
                        }

                        let itemCost = quantity * newItem.data.price;
                        let currentActorFunds = duplicate(currentActor.data.data.currency);
                        let conversionRate = { "pp": 10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01 };
                        let currentActorFundsAsGold = 0;

                        for (let currency in currentActorFunds) {
                            currentActorFundsAsGold += currentActorFunds[currency] * conversionRate[currency];
                        }

                        if (itemCost >= currentActorFundsAsGold) {
                            console.log("Loot Sheet | Not enough funds to purchase item")
                            return;
                        }

                        currentActorFundsAsGold -= itemCost;

                        for (let currency in currentActorFunds) {
                            currentActorFunds[currency] = Math.floor(currentActorFundsAsGold / conversionRate[currency]);
                            currentActorFundsAsGold -= currentActorFunds[currency] * conversionRate[currency];
                        }

                        newItem.data.quantity = quantity;
                        currentActor.update({"data.currency": currentActorFunds});
                        currentActor.createEmbeddedEntity("OwnedItem", newItem);
                    }
                }
            })
            d.render(true);
        } else {
            console.log("Loot Sheet | No active character for user");
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle price modifier
     * @private
     */
    _priceModifier(event) {
        event.preventDefault();
        //console.log("Loot Sheet | Price Modifier clicked");
        //console.log(this.actor.isToken);

        var html = "<p>Use this slider to increase or decrease the price of all items in this inventory. <i class='fa fa-question-circle' title='This uses a percentage factor where 100% is the current price, 0% is 0, and 200% is double the price.'></i></p>";

        html += '<p><input name="price-modifier-percent" id="price-modifier-percent" type="range" min="0" max="200" value="100" class="slider"></p>';

        html += '<p><label>Percentage:</label> <input type=number min="0" max="200" value="100" id="price-modifier-percent-display"></p>';

        html += '<script>var pmSlider = document.getElementById("price-modifier-percent"); var pmDisplay = document.getElementById("price-modifier-percent-display"); pmDisplay.value = pmSlider.value; pmSlider.oninput = function() { pmDisplay.value = this.value; }; pmDisplay.oninput = function() { pmSlider.value = this.value; };</script>';

        let d = new Dialog({
            title: "Price Modifier",
            content: html,
            buttons: {
             one: {
              icon: '<i class="fas fa-check"></i>',
              label: "Update",
              callback: () => this._updatePrices(document.getElementById("price-modifier-percent").value)
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
        for (let c in currencySplit) {
            if (owners.length)
                currencySplit[c].value = Math.floor(currencySplit[c].value / owners.length);
            else
                currencySplit[c].value = 0
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
                    'value': 0
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


        // Read player permission on this actor and adjust to new level
        let currentPermissions = duplicate(actorData.permission);

        //console.log("Loot Sheet | currentPermissions ", currentPermissions);

        
        currentPermissions[playerId] = newLevel;
        

        //console.log("Loot Sheet | updated currentPermissions ", currentPermissions);

        //console.log("Loot Sheet | this.actor.permission after update ", this.actor.data.permission);
		
        // Save updated player permissions
        const lootPermissions = new PermissionControl(this.actor);
        lootPermissions._updateObject(event, currentPermissions);

        this._onSubmit(event);
    }

    /* -------------------------------------------- */

    /**
     * Organize and classify Items for Loot NPC sheets
     * @private
     */
    _updatePrices(pm) {
        //console.log("Loot Sheet | Price Modifier Updating prices...", pm);

        let actorData = duplicate(this.actor.data);

        if (pm === undefined || pm === "100") return;

        for (let i of actorData.items) {
            
            //console.log("Loot Sheet | item", i);
                        
            var currentPrice = i.data.price;

            //accomodate small prices so they don't get rounded to 0
            if (currentPrice < 1) {
                var newPrice = pm === 0 ? 0 : (currentPrice * (pm / 100)).toFixed(2);
            } else {
                var newPrice = pm === 0 ? 0 : Math.round(currentPrice * (pm / 100));
            }

            //console.log(newPrice);
            i.data.price = newPrice;
            
            this.actor.updateOwnedItem(i);
        }

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
            0: "None (cannot access actor)",
            2: "Observer (access to actor but cannot access items)",
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
	
	game.settings.register("lootsheetnpc5e", "changeScrollIcon", {
		name: "Change icon for Spell Scrolls?",
		hint: "Changes the icon for spell scrolls to a scroll icon. If left unchecked, retains the spell's icon.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
});

import { PermissionHelper } from "./PermissionHelper.js";
import { MODULE } from "../config.js";

const ModulSocket = "module." + MODULE.ns;

class LootSheetNPC5eHelper {

    /**
     * 
     * @param {Actor5e} actor 
     * @param {*} event 
     * @param {*} html 
     */
    static async _changeSheetType(actor, event, html) {
        event.preventDefault();
        console.log("Loot Sheet | Sheet Type changed", event);

        const selectedIndex = event.target.selectedIndex,
            selectedItem = event.target[selectedIndex].value;

        await actor.setFlag(MODULE.ns, "lootsheettype", selectedItem);
    }

    /**
     * Retrieve the loot permission for a player, given the current actor data.
     * 
     * It first tries to get an entry from the actor's permissions, if none is found it uses default, otherwise returns 0.
     * 
     */
    static getLootPermissionForPlayer(actorData, player) {
        let defaultPermission = actorData.permission.default;
        if (player.data._id in actorData.permission) {
            return actorData.permission[player.data._id];
        } else if (typeof defaultPermission !== "undefined") {
            return defaultPermission;
        }

        return 0;
    }

    /**
     * Handles Currency from currency.TYPE.value to currency.TYPE for backwords support
     * @param {string} folderPath - The directory to loop through
     */
    static convertCurrencyFromObject(currency) {
        Object.entries(currency).map(([key, value]) => {
            currency[key] = value.value ?? value;
        });
        return currency;
    }

    /**
     * 
     * @param {Array<object>} items 
     * @param {number} chanceOfDamagedItems 
     * @param {number} damagedItemsMultiplier 
     * @param {number} removeDamagedItems 
     * 
     * @returns {Array<Items>} items Filtered lootable items
     */
    static _getLootableItems(
        items,
        options = undefined
    ) {
        options = LootSheetNPC5eHelper._getOptionsDefault(options);

        return items
            /** .map((item) => {
                return item.toObject();
            })*/
            .filter((item) => {
                if (item.type == 'weapon') {
                    return item.data.weaponType != 'natural';
                }

                if (item.type == 'equipment') {
                    if (!item.data.armor) return true;
                    return item.data.armor.type != 'natural';
                }

                return !['class', 'spell', 'feat'].includes(item.type);
            })
            .filter((item) => {
                if (LootSheetNPC5eHelper._isItemDamaged(item, options.chanceOfDamagedItems)) {
                    if (options.removeDamagedItems) return false;

                    item.name += ' (Damaged)';
                    item.data.price *= options.damagedItemsMultiplier;
                }

                return true;
            })
            .map((item) => {
                item.data.equipped = false;
                return item;
            });
    }

    /**
     * Take an options object an either keep values or set the default
     * 
     * @param {*} options 
     * @returns {object}
     */
    static _getOptionsDefault(options){
         return {
            chanceOfDamagedItems: options ? options?.chanceOfDamagedItems | 0 : 0,
            damagedItemsMultiplier: options ? options?.damagedItemsMultiplier | 0 : 0,
            removeDamagedItems: options ? options?.removeDamagedItems | false : false
            };
    }

    static _isItemDamaged(item, chanceOfDamagedItems) {
        const rarity = item.data.rarity;
        if (!rarity) return false;

        // Never consider items above common rarity breakable
        if (rarity.toLowerCase() !== 'common' && rarity.toLowerCase() !== 'none')
            return false;

        return Math.random() < chanceOfDamagedItems;
    }

    /* -------------------------------------------- */
    /**
     * Handle Loot item
     * @private
     */
    static _lootItem(token, event, all = 0) {
        event.preventDefault();
        console.log("Loot Sheet | Loot Item clicked");
        const targetGm = PermissionHelper.getTargetGM();

        if (!targetGm) return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to purchase an item.");
        if (token === null) return ui.notifications.error(`You must loot items from a token.`);
        if (!game.user.actorId) {
            console.log("Loot Sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }

        const itemId = event.currentTarget.dataset.itemId || event.currentTarget.closest('.item').dataset.itemId,
            targetItem = token.actor.getEmbeddedEntity("Item", itemId);

        const item = { itemId: itemId, quantity: 1 };
        if (all || event.shiftKey) {
            item.quantity = targetItem.data.data.quantity;
        }

        const packet = {
            type: "loot",
            looterId: game.user.actorId,
            tokenId: token.id,
            items: [item],
            processorId: targetGm.id
        };

        if (targetItem.data.data.quantity === item.quantity) {
            console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
            game.socket.emit(ModulSocket, packet);
            return;
        }

        const dialog = new QuantityDialog((quantity) => {
            packet.items[0]['quantity'] = quantity;
            console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
            game.socket.emit(ModulSocket, packet);
        },
            {
                acceptLabel: "Loot"
            }
        );
        dialog.render(true);
    }

    static distributeCoins(containerActor) {
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

                // Add currency to permitted actor
                newCurrency[c] = parseInt(currency[c] || 0) + currencySplit[c];

                //console.log("Loot Sheet | New Currency", newCurrency);
                u.update({
                    'data.currency': newCurrency
                });
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
     * 
     * @param {Actor5e} containerActor 
     * @param {User} looter 
     */
    lootCoins(containerActor, looter) {
        let actorData = containerActor.data

        let sheetCurrency = LootSheetNPC5eHelper.convertCurrencyFromObject(actorData.data.currency);
        //console.log("Loot Sheet | Currency data", currency);

        // add currency to actors existing coins
        let msg = [];
        let currency = LootSheetNPC5eHelper.convertCurrencyFromObject(looter.data.data.currency),
            newCurrency = duplicate(LootSheetNPC5eHelper.convertCurrencyFromObject(looter.data.data.currency));

        //console.log("Loot Sheet | Current Currency", currency);

        for (let c in currency) {
            // add msg for chat description
            if (sheetCurrency[c]) {
                //console.log("Loot Sheet | New currency for " + c, currencySplit[c]);
                msg.push(` ${sheetCurrency[c]} ${c} coins`)
            }
            if (sheetCurrency[c] != null) {
                // Add currency to permitted actor
                newCurrency[c] = parseInt(currency[c] || 0) + parseInt(sheetCurrency[c]);
                looter.update({
                    'data.currency': newCurrency
                });
            }
        }

        // Remove currency from loot actor.
        let lootCurrency = LootSheetNPC5eHelper.convertCurrencyFromObject(containerActor.data.data.currency),
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

}
export { LootSheetNPC5eHelper };
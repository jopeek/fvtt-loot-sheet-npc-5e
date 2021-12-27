import { LootSheetNPC5eHelper } from './LootSheetNPC5eHelper.js';
import { MODULE } from '../config.js';
import { PermissionHelper } from './PermissionHelper.js';
class ItemHelper {

    /**
     *
     * @param {Actor5e} source
     * @param {Actor5e} destination
     * @param {Array<Item>} items
     */
    static async lootItems(source, destination, items) {
        let moved = await ItemHelper.moveItems(source, destination, items);

        for (let m of moved) {
            ItemHelper.chatMessage(source, destination, `${destination.name} looted ${m.quantity} x ${m.item.name}.`, m.item);
        }
    }

    /**
     *
     * @param {Actor5e} source
     * @param {Actor5e} destination
     * @param {Item} items
     * @returns {Array<object>} Array with moved item
     */
    static async moveItems(source, destination, items) {
        const sourceUpdates = [],
            sourceDeletes = [],
            destinationAdditions = [],
            destinationUpdates = [],
            results = [];

        /**
         *  Could be optimized to do a direct call instead of {crudAction}embeddedDocuments
         *  when items is only one item.
         **/
        for (let item of items) {
            const sourceItem = source.getEmbeddedDocument("Item", item.id),
                quantity = (sourceItem.data.data.quantity < item.quantity) ? parseInt(sourceItem.data.data.quantity) : parseInt(item.quantity),
                updatedItem = { _id: sourceItem.id, data: { quantity: sourceItem.data.data.quantity - quantity }},
                targetItem = destination.getEmbeddedCollection('Item').find(i =>
                    sourceItem.name === i.name
                    && sourceItem.data.data.price === i.data.data.price
                    && sourceItem.data.data.weight === i.data.data.weight
                );

            if (targetItem) {
                let targetUpdate = { _id: targetItem.id, data: { quantity: parseInt(targetItem.data.data.quantity + quantity) }};
                destinationUpdates.push(targetUpdate);
            } else {
                let newItem = duplicate(sourceItem);
                newItem.data.quantity = parseInt(quantity);
                destinationAdditions.push(newItem);
            }

            if (updatedItem.data.quantity === 0) {
                sourceDeletes.push(sourceItem.id);
            } else {
                sourceUpdates.push(updatedItem);
            }

            results.push({
                item: targetItem || newItem,
                quantity: quantity
            });
        }

        await ItemHelper._updateActorInventory(source, { type: 'delete', data: sourceDeletes }, sourceUpdates);
        await ItemHelper._updateActorInventory(destination, { type: 'create', data: destinationAdditions }, destinationUpdates);

        return results;
    }

    /**
     * Updates an item in an actor's inventory
     *
     * @param {Actor5e} actor
     * @param {object} items
     * @param {Array<Item5e>} updatedItems
     */
    static async _updateActorInventory(actor, items, updatedItems) {

        if (items.data.length > 0) {
            if (items.type === 'create') {
                await actor.createEmbeddedDocuments("Item", items.data);
            } else if (items.type === 'delete') {
                await actor.deleteEmbeddedDocuments("Item", items.data);
            }
        }

        if (updatedItems.length > 0) {
            await actor.updateEmbeddedDocuments("Item", updatedItems);
        }
    }

    /**
     * Handle a buy transaction between seller & buyer
     *
     * @param {Actor} seller
     * @param {Actor} buyer
     * @param {string} id
     * @param {number} quantity
     */
    static async transaction(seller, buyer, id, quantity) {
        let sellItem = seller.getEmbeddedDocument("Item", id);

        if (sellItem.data.data.quantity < quantity) {
            quantity = sellItem.data.data.quantity;
        }

        // On 0 quantity skip everything to avoid error down the line
        if (quantity == 0) {
            ItemHelper.errorMessageToActor(buyer, `Not enought items on vendor.`);
            return;
        }

        let sellerModifier = seller.getFlag(MODULE.ns, MODULE.keys.priceModifier);
        if (typeof sellerModifier !== 'number') sellerModifier = 1.0;

        let itemCostInGold = Math.round(sellItem.data.data.price * sellerModifier * 100) / 100;

        itemCostInGold *= quantity;
        //console.log(`ItemCost: ${itemCostInGold}`)
        let buyerFunds = duplicate(LootSheetNPC5eHelper.convertCurrencyFromObject(buyer.data.data.currency));

        const conversionRates = {
            "pp": 1,
            "gp": CONFIG.DND5E.currencies.gp.conversion.each,
            "ep": CONFIG.DND5E.currencies.ep.conversion.each,
            "sp": CONFIG.DND5E.currencies.sp.conversion.each,
            "cp": CONFIG.DND5E.currencies.cp.conversion.each
        };

        const compensationCurrency = { "pp": "gp", "gp": "ep", "ep": "sp", "sp": "cp" };

        let itemCostInPlatinum = itemCostInGold / conversionRates["gp"],
            buyerFundsAsPlatinum = buyerFunds["pp"];

        buyerFundsAsPlatinum += buyerFunds["gp"] / conversionRates["gp"];
        buyerFundsAsPlatinum += buyerFunds["ep"] / conversionRates["gp"] / conversionRates["ep"];
        buyerFundsAsPlatinum += buyerFunds["sp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"];
        buyerFundsAsPlatinum += buyerFunds["cp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"] / conversionRates["cp"];

        // console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);

        if (itemCostInPlatinum > buyerFundsAsPlatinum) {
            ItemHelper.errorMessageToActor(buyer, `Not enough funds to purchase item.`);
            return;
        }

        let convertCurrency = game.settings.get(MODULE.ns, "convertCurrency");

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

            //console.log(`${currency} : ${amount}: ${conversionRates[currency]}`);

            // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
            // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
            // If we would floor 15.99999999999918 everything explodes
            let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
            buyerFunds[currency] = newFund;

            //console.log(`New Buyer funds ${currency}: ${buyerFunds[currency]}`);
            let compCurrency = compensationCurrency[currency]

            // We dont care about fractions of CP
            if (currency != "cp") {
                // We calculate the amount of lower currency we get for the fraction of higher currency we have
                let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
                buyerFunds[compCurrency] += toAdd
                //console.log(`Added ${toAdd} to ${compCurrency} it is now ${buyerFunds[compCurrency]}`);
            }
        }

        buyer.update({ "data.currency": buyerFunds });
        let moved = await ItemHelper.moveItems(seller, buyer, [{ id: id, quantity }]);

        for (let m of moved) {
            ItemHelper.chatMessage(
                seller, buyer,
                `${buyer.name} purchases ${quantity} x ${m.item.name} for ${itemCostInGold}gp.`,
                m.item);
        }
    }

    /**
     *
     * @param {Actor5e} containerActor
     * @param {User} looter
     */
    static async lootCoins(containerActor, looter) {
        const actorData = containerActor.data;

        let sheetCurrency = LootSheetNPC5eHelper.convertCurrencyFromObject(actorData.data.currency);
        //console.log("Loot Sheet | Currency data", currency);

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

    /**
     * Split the currency of an actor between multiple actors
     *
     * @param {Actor5e} actor
     * @returns
     */
    static distributeCoins(actor) {
        const actorData = actor.data,
            players = game.users.players,
            observers = ItemHelper.getEligablePlayers(players, actor, observers),
            [currencyShares, npcRemainingCurrency] = ItemHelper.getSharesAndRemainder(actorData.data.currency, observers.length);

        let msg = [];

        console.log(MODULE.ns + " | ItemHelper | splitCoins | actorData", actorData);
        console.log(MODULE.ns + " | ItemHelper | splitCoins | players", players);
        console.log(MODULE.ns + " | ItemHelper | splitCoins | observers", observers);
        console.log(MODULE.ns + " | ItemHelper | splitCoins | currencyShares", currencyShares);
        console.log(MODULE.ns + " | ItemHelper | splitCoins | npcRemainingCurrency", npcRemainingCurrency);

        if (observers.length === 0) return;

        // add currency to actors existing coins
        debugger;

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
        }

        actor.update({
            "data.currency": currencyRemainder
        });


        // Create chat message for coins received
        if (msg.length != 0) {
            let message = `${u.data.name} receives: `;
            message += msg.join(",");
        }

        ChatMessage.create({
            user: game.user.id,
            speaker: {
                actor: actor,
                alias: actor.name
            },
            content: message
        });
    }

    /**
     * Get all players with at least observer permissions
     *
     * @param {Actor5e} actor
     * @param {Array<User>} players
     *
     * @returns {Array<User>}
     */
    static getEligablePlayers(actor, players) {
        let observers = [];
        for (let player of players) {
            if (
                player != "default"
                && PermissionHelper.getLootPermissionForPlayer(actor.data, player) >= 2
            ) {
                let eligablePlayerCharacter = game.actors.get(player.data.character);
                if (eligablePlayerCharacter != null && (player.data.role === 1 || player.data.role === 2))
                    observers.push(eligablePlayerCharacter);
            }
        }
        return observers;
    }

    /**
     * Splits the values of a type in the stack between splitBy
     *
     * @param {object} stack
     * @param {number} splitBy
     *
     * @returns {Array<object>} Array with
     */
    static getSharesAndRemainder(stack, splitBy) {
        debugger;
        let shares = [],
            remainder = {};

        for (let type in stack) {
            shares[type] = Math.floor(stack[type] / splitBy);
            remainder[type] = shares[type] % splitBy;
        }

        return [shares, remainder];
    }

    /**
     *
     * @param {Actor5e} looted
     * @param {Actor5e} looter
     * @param {string} message
     * @param {Item5e} item
     */
    static chatMessage(looted, looter, message, item) {
        if (game.settings.get(MODULE.ns, "buyChat")) {
            message = `
            <div class="dnd5e chat-card item-card" data-actor-id="${looter.id}" data-item-id="${item.id}">
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
                user: game.user.id,
                speaker: {
                    actor: looted,
                    alias: looted.name
                },
                content: message
            });
        }
    }

    /**
     *
     * @param {Actor5e} target
     * @param {string} message
     */
    static errorMessageToActor(target, message) {
        game.socket.emit(MODULE.socket, {
            type: "error",
            targetId: target.id,
            message: message
        });
    }
}
export { ItemHelper };

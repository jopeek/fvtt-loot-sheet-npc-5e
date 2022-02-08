import { MODULE } from "../data/moduleConstants.js";
import { ChatHelper } from "./ChatHelper.js";
import { CurrencyHelper } from "./CurrencyHelper.js";
import { ItemHelper } from "./ItemHelper.js";
import { PermissionHelper } from "./PermissionHelper.js";

/**
 * @Module LootsheetNPC5e.Helpers.TradeHelper
 * @name TradeHelper
 *
 * @classdec Static helper methods for trading
 *
 * @since 3.4.5.3
 * @author Daniel Böttner <daniel@est-in.eu>
 * @license MIT
 */
export class TradeHelper {

    /**
     * @summary Handle the trade between two actors
     *
     * @description This method handles the trade between two actors.
     *
     * It is called by the trade button on the loot sheet.
     * - in the future may -> It is also called by the trade button on the item sheet.
     * - in the future may -> It is also called by the trade button on the character sheet.
     *
     * @param {Actor} npcActor The NPC Actor that is trading with the player
     * @param {Actor} playerCharacter The Player Character that is trading with the NPC
     * @param {Array} trades The trades that are to be executed
     * @param {object} options The options for the trade
     *
     * @returns {Promise<boolean>}
     */
    static async tradeItems(npcActor, playerCharacter, trades, options = {}) {
        // for tradeType in object trades get the array
        for (let type in trades) {
            if (!trades[type].length > 0) continue;
            options.type = type;
            this._handleTradyByType(trades, playerCharacter, npcActor, options);
        }
    }

    /**
     * @summary loot items from one actor to another
     *
     * @description Move items from one actor to another
     * Assumes that the set of items is valid and can be moved.
     *
     * @param {Actor} source
     * @param {Actor} destination
     * @param {Array<Item>} items
     *
     * @inheritdoc
     */
    static async lootItems(source, destination, items, options) {
        let movedItems = await ItemHelper.moveItemsToDestination(source, destination, items);
        ChatHelper.chatMessage(source, destination, movedItems, options);

    }

    /**
     * @summary -- 👽☠️🏴‍☠️All ya Items belong to us 🏴‍☠️☠️👽  --
     *
     * @description Gets the lootable subset of the items in
     * the source actor and moves this subset to the destination actor.
     *
     * @param {Actor} source
     * @param {Actor} destination
     *
     * @returns {Promise<Array<Item>>}
     *
     * @function
     *
     * @since 3.4.5.3
     * @author Daniel Böttner <daniel@est-in.eu>
     */
    static async lootAllItems(source, destination, options = {}) {
        const items = ItemHelper.getLootableItems(source.items).map((item) => ({
            id: item.id,
            data: {
                data: {
                    quantity: item.data.data.quantity
                }
            }
        }));

        this.lootItems(source, destination, items);
        this.lootCurrency(source, destination);
    }

    /**
     * Handle a buy transaction between a seller & a buyer
     *
     * @description
     * #### This could likely be refactored or scrubbed.
     * See [tradeItems](#tradeItems) for the more generic version.
     *
     * - First the buy item button in the inventory needs to be refactored.
     * - - The buttons action needs to be changed to tradeItems
     * - - The buttons class so it gets picket up by the actionButtons selector (eventListener)
     * - The items need to be parsed to resemble the item structure of items in the trade stage
     * - - see [_handleTradeStage](LootSheetNPC5e.Helpers.LootSheetNPC5eHelper._handleTradeStage) for more details
     * - - Maybe by making each html row(~item) a stage.
     *
     * @todo Refactor and make obsolete
     *
     * @see this.tradeItems for the more generic version
     * @see LootSheetNPC5e.Helpers.LootSheetNPC5eHelper._handleTradeStage for the stage handling
     *
     * @param {Actor} seller
     * @param {Actor} buyer
     * @param {string} itemId
     * @param {number} quantity
     * @param {object} options
     *
     * @returns {Promise<boolean>}
     *
     * @author Jan Ole Peek <@jopeek>
     * @author Daniel Böttner <@DanielBoettner>
     * @since 1.0.1
     *
     * @inheritdoc
     */
    static async transaction(seller, buyer, itemId, quantity, options = { chatOutPut: true }) {
        // On 0 quantity skip everything to avoid error down the line
        const soldItem = seller.getEmbeddedDocument("Item", itemId),
            priceModifier = parseFloat(seller.getFlag(MODULE.ns, MODULE.flags.priceModifier)) || 1;

        if (!soldItem) return ItemHelper.errorMessageToActor(seller, `${seller.name} doesn't posses this item anymore.`);

        let moved = false;
        quantity = (soldItem.data.data.quantity < quantity) ? parseInt(soldItem.data.data.quantity) : parseInt(quantity);

        let itemCostInGold = (Math.round(soldItem.data.data.price * priceModifier * 100) / 100) * quantity,
            successfullTransaction = await this._updateFunds(seller, buyer, itemCostInGold);
        if (!successfullTransaction) return false;
        moved = await ItemHelper.moveItemsToDestination(seller, buyer, [{ id: itemId, data: { data: { quantity: quantity } } }]);
        options.type="buy";
        options.priceModifier = priceModifier;
        ChatHelper.chatMessage(seller, buyer, moved, options);
    }

    /**
     * @summary  (🧑‍🎤🪙 ➗ 👥) - (🧑‍🎤🪙) -> 💰 -> 👥🪙 + 💰
     *
     * @description Split the currency of an actor between multiple eligable player actors
     *
     * @param {Actor} actor
     * @param {options} options
     *
     * @returns {Promise<boolean>}
     */
    static distributeCurrency(actor, options = { verbose: true }) {
        const actorData = actor.data,
            eligables = PermissionHelper.getEligablePlayerActors(actor),
            currency = CurrencyHelper.handleActorCurrency(actorData.data.currency),
            [currencyShares, npcRemainingCurrency] = CurrencyHelper.getSharesAndRemainder(currency, eligables.length);

        let msg = [];

        if (options.verbose) {
            let cmsg = `${MODULE.ns} | ${distributeCoins.name}|`;
            console.log(cmsg + ' actorData:', actorData);
            console.log(cmsg + ' players:', game.users.players);
            console.log(cmsg + ' observers:', eligables);
            console.log(cmsg + ' currencyShares:', currencyShares);
            console.log(cmsg + ' npcRemainingCurrency', npcRemainingCurrency);
        }

        if (eligables.length === 0) return;

        for (let player of game.users.players) {
            let playerCharacter = player.character;
            if (playerCharacter === null) continue;
            if (!eligables.includes(playerCharacter.id)) continue;

            msg = [];
            let playerCurrency = duplicate(playerCharacter.data.data.currency),
                newCurrency = duplicate(playerCharacter.data.data.currency);

            for (let c in playerCurrency) {
                if (currencyShares[c]) {
                    msg.push(`${playerCharacter.data.name} receives:${currencyShares[c]} ${c} coins.`)
                }
                newCurrency[c] = parseInt(playerCurrency[c] || 0) + currencyShares[c];
                playerCharacter.update({
                    'data.currency': newCurrency
                });
            }
        }

        actor.update({
            "data.currency": npcRemainingCurrency
        });


        // Create chat message for coins received
        let message = `The  ${currencyShares.join(', ')} coins of ${actor.name} where shared between ${eligables.length} creatures.`;
        if (msg.length > 0)
            message += msg.join(",");


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
     * @summary #### loot funds from an actor to another
     * @example 🧑‍🎤 -> 💰 -> 🧑‍🎤
     *
     * @description move the funds from one actor to another
     *
     * @todo maybe refactor to use the Currencyhelper and the ChatHelper
     *
     * @param {Actor5e} source
     * @param {User} destination
     *
     * @returns {Promise<boolean>}
     * @author Jan Ole Peek <@jopeek>
     *
     * @since 1.0.0
     * @inheritdoc
     */
    static async lootCurrency(source, destination) {
        const actorData = source.data;
        let sheetCurrency = duplicate(actorData.data.currency);
        let msg = [];
        let currency = duplicate(destination.data.data.currency),
            newCurrency = duplicate(destination.data.data.currency);

        for (let c in currency) {
            if (sheetCurrency[c]) {
                msg.push(` ${sheetCurrency[c]} ${c} coins`)
            }
            if (sheetCurrency[c] != null) {
                newCurrency[c] = parseInt(currency[c] || 0) + parseInt(sheetCurrency[c]);
                destination.update({
                    'data.currency': newCurrency
                });
            }
        }

        // Remove currency from loot actor.
        let lootCurrency = duplicate(source.data.data.currency),
            zeroCurrency = {};

        for (let c in lootCurrency) {
            zeroCurrency[c] = 0;
            source.update({
                "data.currency": zeroCurrency
            });
        }

        /**
         * Could likely be handled by the ChatHelper.chatMessage function
         */
        // Create chat message for coins received
        if (msg.length != 0) {
            let message = `${destination.data.name} receives: `;
            message += msg.join(",");
            ChatMessage.create({
                user: game.user._id,
                speaker: {
                    actor: source,
                    alias: source.name
                },
                content: message,
                flags: {
                    lootsheetnpc5e: {
                        type: 'loot',
                        lootedCurrency: lootCurrency
                    }
                }
            });
        }
    }

    /**
     * @summary Handle a trade by its type
     * @description
     *
     * | Currently supported types |
     * | ---  | --- |
     * | buy  | Player actor buys from a NPC |
     * | sell | Player actor sells to NPC |
     * | loot | Player Actor loots from the NPC |
     * | --- | --- |
     *
     * @param {Array} trades
     * @param {Actor} playerCharacter
     * @param {Actor} npcActor
     * @param {object} options
     *
     * @returns {Promise<boolean>}
     *
     * @function
     * @inheritdoc
     * @since 3.4.5.3
     * @author Daniel Böttner <@DanielBoettner>
     *
     */
    static async _handleTradyByType(trades, playerCharacter, npcActor, options) {
        let moved = { sell: [], buy: [], give: [], loot: [] };

        const tradeType = options.type,
            playerActions = ['sell', 'give'],
            source = playerActions.includes(tradeType) ? playerCharacter : npcActor,
            destination = playerActions.includes(tradeType) ? npcActor : playerCharacter,
            preparedTrade = this._prepareTrade(source, trades[tradeType], options),
            successfullTransaction = await this.moneyExchange(source, destination, tradeType, preparedTrade.tradeSum);

        if (!successfullTransaction) return false;

        moved[tradeType] = await ItemHelper.moveItemsToDestination(source, destination, preparedTrade.items);
        ChatHelper.chatMessage(npcActor, playerCharacter, moved[tradeType], options);
    }

    /**
     * @param {Actor} source
     * @param {Actor} destination
     * @param {string} tradeType
     * @param {number} tradeSum
     *
     * @returns {boolean} success
     */
    static async moneyExchange(source, destination, tradeType, tradeSum = 0){
        const freeTradeTypes = ['loot', 'give'];
        let successfullTransaction = true;

        if(!freeTradeTypes.includes(tradeType)){
            successfullTransaction = await this._updateFunds(source, destination, tradeSum);
        }

        return successfullTransaction;
    }

    /**
     *
     * @description
     * Check again if the source posses the item
     * If the source is not in possesion of the item anymore, remove it from the items array.
     *
     * If the source is in possession add its worth to the total tradesum.
     *
     * @param {Actor} source
     * @param {Collection} items
     * @param {number} tradeSum
     * @param {object} options
     *
     * @returns {Array} [items, tradeSum]
     *
     * @author Daniel Böttner <@DanielBoettner>
     */
    static _prepareTrade(source, items, options = {}) {
        const priceModifier = this._getPriceModifier(source);
        let tradeSum = 0;
        for (const [key, item] of items.entries()) {
            if (!source.items.find(i => i.id == item.id)) {
                if (options?.verbose)
                    console.log(`${MODULE.ns} | ${this._prepareTrade.name} | Removed item "${item.name}" (id: ${item.id}) from trade. Item not found in inventory of the source actor.`);
                delete items[key];
                continue;
            }
            // Add item price to the total sum of the trade
            tradeSum += (Math.round(item.data.data.price * priceModifier * 100) / 100) * item.data.data.quantity;
            if (options?.verbose) console.log(`${MODULE.ns} | ${this._prepareTrade.name} | tradeSum updated to: `);
        }

        return {items: items, tradeSum: tradeSum};
    }

    /**
     *
     * @param {Actor} actor
     *
     * @returns {number}
     *
     */
    static _getPriceModifier(actor) {
        let priceModifier = actor.getFlag(MODULE.ns, MODULE.flags.priceModifier) || 1;
        return parseFloat(priceModifier).toPrecision(2) || 1;
    }

    /**
     * @summary Check the buyers funds and transfer the funds if they are enough
     *
     * @param {Actor} seller
     * @param {Actor} buyer
     * @param {number} itemCostInGold
     *
     * @returns {boolean}
     *
     * @version 1.1.0
     *
     * @author Jan Ole Peek @jopeek
     * @author Daniel Böttner @DanielBoettner
     *
     * @returns {boolean} true if the transaction was successful
     */
    static async _updateFunds(seller, buyer, itemCostInGold) {
        const rates = {
            "pp": 1,
            "gp": CONFIG.DND5E.currencies.gp.conversion.each,
            "ep": CONFIG.DND5E.currencies.ep.conversion.each,
            "sp": CONFIG.DND5E.currencies.sp.conversion.each,
            "cp": CONFIG.DND5E.currencies.cp.conversion.each
        };

        let buyerFunds = duplicate(buyer.data.data.currency),
            sellerFunds = duplicate(seller.data.data.currency),
            itemCost = {
                "pp": itemCostInGold / rates.gp,
                "gp": itemCostInGold
            },
            fundsAsPlatinum = {
                "buyer": this._getFundsAsPlatinum(buyerFunds, rates),
                "seller": this._getFundsAsPlatinum(sellerFunds, rates)
            };

        if (itemCost.pp > fundsAsPlatinum.buyer) {
            ItemHelper.errorMessageToActor(buyer, buyer.name + ` doesn't have enough funds to purchase an item for ${itemCost.gp}gp.`);
            return false;
        }

        [buyerFunds, sellerFunds] = this._getUpdatedFunds(buyerFunds, sellerFunds, itemCost, rates, fundsAsPlatinum);

        await seller.update({ data: { currency: sellerFunds } });
        await buyer.update({ data: { currency: buyerFunds } });

        return true;
    }

    /**
     *
     * @param {object} buyerFunds
     * @param {object} sellerFunds
     * @param {object} rates
     * @param {number} fundsAsPlatinum
     *
     * @returns {Array<object>} [buyerFunds, sellerFunds]
     *
     * @author Jan Ole Peek < @jopeek >
     * @author Daniel Böttner < @DanielBoettner >
     */
    static _getUpdatedFunds(buyerFunds, sellerFunds, itemCost, rates, fundsAsPlatinum) {
        const compensation = { "pp": "gp", "gp": "ep", "ep": "sp", "sp": "cp" };

        if (game.settings.get(MODULE.ns, "convertCurrency")) {
            fundsAsPlatinum.buyer -= itemCost.pp;
            fundsAsPlatinum.seller += itemCost.pp;
            buyerFunds = this._updateConvertCurrency(buyerFunds, fundsAsPlatinum.buyer);
            sellerFunds = this._updateConvertCurrency(sellerFunds, fundsAsPlatinum.seller);
        } else {
            if(buyerFunds.gp >= itemCost.gp) {
                buyerFunds.gp -= itemCost.gp;
                sellerFunds.gp += itemCost.gp;
            } else {
                buyerFunds.pp -= itemCost.pp;
                sellerFunds.pp += itemCost.pp;
            }

            buyerFunds = this._smoothenFunds(buyerFunds, compensation, rates);
            sellerFunds = this._smoothenFunds(sellerFunds, compensation, rates);
        }
        return [buyerFunds, sellerFunds];
    }

    /**
     * @summary get the funds as platinum value
     *
     * @param {object} funds
     * @returns {string}
     *
     * @author Jan Ole Peek < @jopeek >
     * @version 1.0.0
     *
     */
    static _getFundsAsPlatinum(funds, rates) {
        let fundsAsPlatinum = funds["pp"];

        fundsAsPlatinum += funds["gp"] / rates["gp"];
        fundsAsPlatinum += funds["ep"] / rates["gp"] / rates["ep"];
        fundsAsPlatinum += funds["sp"] / rates["gp"] / rates["ep"] / rates["sp"];
        fundsAsPlatinum += funds["cp"] / rates["gp"] / rates["ep"] / rates["sp"] / rates["cp"];

        return fundsAsPlatinum;
    }

    /**
     * @param {object}
     * @param {number} funds
     */
    static _updateConvertCurrency(funds, fundsAsPlatinum) {
        for (let currency in funds) {
            funds[currency] = 0; // Remove every coin we have
        }
        funds.pp = fundsAsPlatinum;

        return funds;
    }


    /**
     * @summary Take portions of a currency and add them as a integer to the next lower currency
     *
     * @param {object} funds
     * @param {object} compensation
     * @param {object} rates
     *
     * @returns {object}
     */
    static _smoothenFunds(funds, compensation, rates ){
        for (let currency in funds) {
            let current = funds[currency].toFixed(5),
                currentPart = (current % 1).toFixed(5),
                currentInt = Math.round(current - currentPart),
                compCurrency = compensation[currency];

            funds[currency] = (currentInt > 0) ? currentInt : 0;

            if (currency != "cp") {
                // We calculate the amount of lower currency we get for the fraction of higher currency we have
                let change = currentPart * rates[compCurrency];
                funds[compCurrency] += change;
                console.log(`${MODULE.ns} | TradeHelper | updateFunds | Updated ${compCurrency} by ${change} it is now ${funds[compCurrency]}`);
            }
        }

        return funds;
    }
}

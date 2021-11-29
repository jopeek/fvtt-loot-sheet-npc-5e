class ItemHelper {

    /**
     * 
     * @param {Actor5e} container 
     * @param {Actor5e} looter 
     * @param {Array<Item>} items 
     */
    static async lootItems(container, looter, items) {
        let moved = await ItemHelper.moveItems(container, looter, items);

        for (let m of moved) {
            ItemHelper.chatMessage(container, looter, `${looter.name} looted ${m.quantity} x ${m.item.name}.`, m.item);
        }
    }

    /**
     * 
     * @param {Actor5e} source 
     * @param {Actor5e} destination 
     * @param {Item} items 
     * @returns 
     */
    static async moveItems(source, destination, items) {
        
        console.log(source);
        console.log(destination);
        console.log(items);

        const updates = [],
              deletes = [],
              additions = [],
              destUpdates = [],
              results = [];

        for (let i of items) {
            let itemId = i.itemId,
                quantity = i.quantity,
                item = source.getEmbeddedEntity("Item", itemId);

            console.log("ITEM: \n");
            console.log(item);

            // Move all items if we select more than the quantity.
            if (item.data.data.quantity < quantity) {
                quantity = item.data.data.quantity;
            }

            //let newItem = duplicate(item);
            let newItem = duplicate(item);
            console.log("NEWITEM: \n");
            console.log(newItem);

            const update = { _id: itemId, "data.quantity": item.data.data.quantity - quantity };

            console.log("UPDATE: \n");
            console.log(update);

            if (update["data.quantity"] === 0) {
                deletes.push(itemId);
            }
            else {
                updates.push(update);
            }

            newItem.data.quantity = quantity;
            console.log("NEWITEM2: \n");
            console.log(newItem);

            results.push({
                item: newItem,
                quantity: quantity
            });

            additions.push(newItem);
            /* if (destItem === undefined) {
                additions.push(newItem);
            } else {
                console.log("Existing Item");
                newItem.data.quantity = Number(destItem.data.data.quantity) + Number(newItem.data.quantity);
                additions.push(newItem);
                
            } */
        }

        if (deletes.length > 0) {
            await source.deleteEmbeddedEntity("Item", deletes);
        }

        if (updates.length > 0) {
            await source.updateEmbeddedEntity("Item", updates);
        }

        if (additions.length > 0) {
            await destination.createEmbeddedEntity("Item", additions);
        }

        if (destUpdates.length > 0) {
            await destination.updateEmbeddedDocuments("Item", destUpdates);
        }

        return results;
    }

    /**
     * Handle a buy transaction between seller & buyer
     * 
     * @param {Actor} seller 
     * @param {Actor} buyer 
     * @param {string} itemId 
     * @param {number} quantity 
     * @returns 
     */
    static async transaction(seller, buyer, itemId, quantity) {
        let sellItem = seller.getEmbeddedEntity("Item", itemId);

        if (sellItem.data.data.quantity < quantity) {
            quantity = sellItem.data.data.quantity;
        }

        // On negative quantity we show an error
        if (quantity < 0) {
            errorMessageToActor(buyer, `Can not buy negative amounts of items.`);
            return;
        }

        // On 0 quantity skip everything to avoid error down the line
        if (quantity == 0) {
            errorMessageToActor(buyer, `Not enought items on vendor.`);
            return;
        }

        let sellerModifier = seller.getFlag(MODULE.ns, MODULE.keys.priceModifier);
        if (typeof sellerModifier !== 'number') sellerModifier = 1.0;

        let itemCostInGold = Math.round(sellItem.data.data.price * sellerModifier * 100) / 100;

        itemCostInGold *= quantity;
        //console.log(`ItemCost: ${itemCostInGold}`)
        let buyerFunds = duplicate(LootSheet5eNPCHelper.convertCurrencyFromObject(buyer.data.data.currency));

        //console.log(`Funds before purchase: ${buyerFunds}`);
        //console.log(buyer.data.data.currency);

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

        //console.log(`Funds after purchase1: ${buyerFunds}`);

        // Update buyer's funds
        buyer.update({ "data.currency": buyerFunds });

        //console.log(`Funds after purchase2: ${buyerFunds}`);
        //console.log(buyer.data.data.currency);

        let moved = await moveItems(seller, buyer, [{ itemId, quantity }]);

        for (let m of moved) {
            ItemHelper.chatMessage(
                seller, buyer,
                `${buyer.name} purchases ${quantity} x ${m.item.name} for ${itemCostInGold}gp.`,
                m.item);
        }
    }

    /**
     * 
     * @param {*} speaker 
     * @param {*} owner 
     * @param {*} message 
     * @param {*} item 
     */
    static chatMessage(speaker, owner, message, item) {
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

    static errorMessageToActor(target, message) {
        game.socket.emit(MODULE.socket, {
            type: "error",
            targetId: target.id,
            message: message
        });
    }
}
export { ItemHelper };
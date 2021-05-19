import ActorSheet5eNPC from "../../../systems/dnd5e/module/actor/sheets/npc.js";
import Item5e from "../../../systems/dnd5e/module/item/entity.js";

export class populateLoot {
	constructor() {
		return this;
	}

	static async generateLoot(scene, data) {
        //instead of the main actor we want/need the actor of the token.
				const tokenId = data._id;
        const token = canvas.tokens.get(tokenId);
        const actor = token.actor;

        const moduleNamespace = "lootsheetnpc5e";
	const rolltableName = actor.getFlag(moduleNamespace, "rolltable") || game.settings.get("lootsheetnpc5e","fallbackRolltable");
        const shopQtyFormula = actor.getFlag(moduleNamespace, "shopQty") || "1";
        const itemQtyFormula = actor.getFlag(moduleNamespace, "itemQty") || "1";
        const itemQtyLimit = actor.getFlag(moduleNamespace, "itemQtyLimit") || "0";
        const clearInventory = actor.getFlag(moduleNamespace, "clearInventory");
        const itemOnlyOnce = actor.getFlag(moduleNamespace, "itemOnlyOnce");
        const reducedVerbosity = game.settings.get("lootsheetnpc5e", "reduceUpdateVerbosity");
        let shopQtyRoll = new Roll(shopQtyFormula);

        shopQtyRoll.roll();

        if (!rolltableName) {
          return;
        }

	let rolltable = game.tables.getName(rolltableName);

        if (!rolltable) {
            return ui.notifications.error(`No Rollable Table found with name "${rolltableName}".`);
        }

        if (itemOnlyOnce) {
            if (rolltable.results.length < shopQtyRoll.total)  {
                return ui.notifications.error(`Cannot create a merchant with ${shopQtyRoll.total} unqiue entries if the rolltable only contains ${rolltable.results.length} items`);
            }
        }

        if (clearInventory) {
            let currentItems = actor.data.items.map(i => i._id);
            await actor.deleteEmbeddedEntity("OwnedItem", currentItems);
        }

        if (!itemOnlyOnce) {
            for (let i = 0; i < shopQtyRoll.total; i++) {
                const rollResult = rolltable.roll();
                let newItem = null;

                if (rollResult.results[0].collection === "Item") {
                    newItem = game.items.get(rollResult.results[0].resultId);
                } else {
                    const items = game.packs.get(rollResult.results[0].collection);
                    newItem = await items.getEntity(rollResult.results[0].resultId);
                }

                if (!newItem || newItem === null) {
                    return;
                }

                if (newItem.type === "spell") {
                    newItem = await Item5e.createScrollFromSpell(newItem)
                }

                let itemQtyRoll = new Roll(itemQtyFormula);
                itemQtyRoll.roll();

                console.log(`Loot Sheet | Adding ${itemQtyRoll.total} x ${newItem.name}`)

                let existingItem = actor.items.find(item => item.data.name == newItem.name);

                if (existingItem === null) {
                    await actor.createEmbeddedEntity("OwnedItem", newItem);
                    console.log(`Loot Sheet | ${newItem.name} does not exist.`);
                    existingItem = await actor.items.find(item => item.data.name == newItem.name);

                    if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
                        await existingItem.update({ "data.quantity": itemQtyLimit });
                        if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
                    } else {
                        await existingItem.update({ "data.quantity": itemQtyRoll.total });
                        if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
                    }
                } else {
                    console.log(`Loot Sheet | Item ${newItem.name} exists.`);

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
        } else {
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

                await item.createEmbeddedEntity("OwnedItem", newItem);
                let existingItem = actor.items.find(item => item.data.name == newItem.name);

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
}

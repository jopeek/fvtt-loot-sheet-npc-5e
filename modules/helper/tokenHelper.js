import Item5e from "/systems/dnd5e/module/item/entity.js";

import { MODULE } from '../data/moduleConstants.js';
import { tableHelper } from "../helper/tableHelper.js";

export class tokenHelper {
    /**
     *
     * @param {Token} token
     * @returns {String|false} a RollTable.id
     */
    static getLinkedRolltable(token) {
        return token.actor.getFlag(MODULE.ns, MODULE.flags.rolltable) || false;
    }

    /**
     *
     * @param {String} creatureType
     * @returns {String|false} a RollTable.id
     */
    static getLinkedRolltableByCreatureType(creatureType) {
        let fallback = game.settings.get(MODULE.ns, "creaturetype_default_" + creatureType + '_table');
        if (fallback != 0) {
            return fallback || false;
        }

        return false;
    }

    static getDefaultFallbackRolltable() {
        return game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackRolltable) || false;
    }

    /**
     *
     * @param {Token} token
     * @returns {Array<String>|false}
     */
    static getLinkedRolltableByFilters(token) {
        const filterRules = game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.rulesets) || false;
        let rolltable = false;

        for (const key in filterRules) {
            if (this.passesFilter(token.actor, filterRules[key].filters)) {
                if (!rolltable) rolltable = [];

                rolltable.push(filterRules[key].rolltable);
            }
        }

        return rolltable;
    }

    /**
     *
     * @param {any} subject
     * @param {any} filters
     *
     * @returns {boolean}
     */
    static passesFilter(subject, filters) {
        for (let filter of Object.values(filters)) {
            let prop = getProperty(subject, `data.${filter.filterpath}`) || getProperty(subject, filter.filterpath);
            if (prop === undefined) return false;
            switch (filter.comparison) {
                case '==': if (prop == filter.value) { return true; } break;
                case '<=': if (prop <= filter.value) { return true; } break;
                case '>=': if (prop >= filter.value) { return true; } break;
                case 'includes': if (prop.includes(filter.value)) { return true; } break;
            }
            continue;
        }

        return false;
    }

	/**
	 * Converts certain documents to loot items
	 *
	 * @param {Item} item
	 * @param
	 * @returns
	 */
	static async applyItemConversions(item, conversions){
		if (item.type === "spell") {
			item = await Item5e.createScrollFromSpell(item);
		}

		const defaultConversions = {
			Actor: {
			  text: `${item.text} Portrait`,
			  img: newItem?.img || "icons/svg/mystery-man.svg"
			},
			Scene: {
			  text: 'Map of '+ newItem?.data?.name,
			  img: newItem?.data?.thumb || "icons/svg/direction.svg",
			  data: {
				  price: new Roll('1d20 + 10').roll().total || 1
			  }
			}
		};

		conversions = conversions || defaultConversions;

		const convert = conversions[item.documentName] ?? false;

		if (convert) {
			for (const prop in convert) {
				item[prop] = convert[prop];
			}
		}

		return item;
	}
    /**
	 *
	 * @param {RollTableDocument} rolltable
	 * @param {TokenDocument} token
	 *
	 */
	static async populateWithRolltable(rolltable, token) {
		const tokenActor = token.actor,
			shopQtyFormula = tokenActor.getFlag(MODULE.ns, "shopQty") || game.settings.get(MODULE.ns, "fallbackShopQty") || "1",
			itemQtyFormula = itemQtyFormula = token.actor.getFlag(MODULE.ns, MODULE.flags.itemQty) || game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackItemQty)|| 1,
			itemQtyLimit = tokenActor.getFlag(MODULE.ns, "itemQtyLimit") || game.settings.get(MODULE.ns, "fallbackItemQtyLimit") || "0",
			itemOnlyOnce = tokenActor.getFlag(MODULE.ns, "itemOnlyOnce") || false,
            reducedVerbosity = game.settings.get(MODULE.ns, "reduceUpdateVerbosity") || true;

		let shopQtyRoll = new Roll(shopQtyFormula);
		shopQtyRoll.roll();

		if (itemOnlyOnce) {
			if (rolltable.results.length < shopQtyRoll.total) {
				return ui.notifications.error(MODULE.ns + `: Cannot create loot with ${shopQtyRoll.total} unqiue entries if the rolltable only contains ${rolltable.results.length} items`);
			}
		}

		if (!itemOnlyOnce) {
			for (let i = 0; i < shopQtyRoll.total; i++) {
				const rollResult = await rolltable.roll();
				let newItem = null;

				if (rollResult.results[0].collection === "Item") {
					newItem = game.items.get(rollResult.results[0].data.resultId);
				} else {
					const items = game.packs.get(rollResult.results[0].data.collection);
					newItem = await items.getDocument(rollResult.results[0].data.resultId);
				}

				newItem = await tableHelper._rollSubTables(newItem);

				if (!newItem || newItem === null) {
					return;
				}

                /**
                 * @todo make this system agnostic
                 * BetterRolltables does it but needs a spell compendium with spells.
                 *
                 */
				newItem = this.applyItemConversions(newItem);

				let itemQtyRoll = new Roll(itemQtyFormula);
				itemQtyRoll.roll();

				if (!reducedVerbosity) console.log(MODULE.ns + `: Adding ${itemQtyRoll.total} x ${newItem.name}`);

				let existingItem = tokenActor.items.find(item => item.data.name == newItem.name);

				if (existingItem === undefined) {
					await tokenActor.createEmbeddedDocuments("Item", [newItem.toObject()]);
					//console.log(MODULE.ns + `: ${newItem.name} does not exist.`);
					existingItem = await tokenActor.items.find(item => item.data.name == newItem.name);

					if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
						await existingItem.update({ "data.quantity": itemQtyLimit });
						if (!reducedVerbosity) ui.notifications.info(MODULE.ns + `: Added new ${itemQtyLimit} x ${newItem.name}.`);
					} else {
						await existingItem.update({ "data.quantity": itemQtyRoll.total });
						if (!reducedVerbosity) ui.notifications.info(MODULE.ns + `: Added new ${itemQtyRoll.total} x ${newItem.name}.`);
					}
				} else {
					if (!reducedVerbosity) console.log(MODULE.ns + `:  Item ${newItem.name} exists.`);

					let newQty = Number(existingItem.data.data.quantity) + Number(itemQtyRoll.total);

					if (itemQtyLimit > 0 && Number(itemQtyLimit) === Number(existingItem.data.data.quantity)) {
						if (!reducedVerbosity) ui.notifications.info(MODULE.ns + `: ${newItem.name} already at maximum quantity (${itemQtyLimit}).`);
					}
					else if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(newQty)) {
						//console.log("Exceeds existing quantity, limiting");
						await existingItem.update({ "data.quantity": itemQtyLimit });

						if (!reducedVerbosity) ui.notifications.info(MODULE.ns + `: Added additional quantity to ${newItem.name} to the specified maximum of ${itemQtyLimit}.`);
					} else {
						await existingItem.update({ "data.quantity": newQty });
						if (!reducedVerbosity) ui.notifications.info(MODULE.ns + `: Added additional ${itemQtyRoll.total} quantity to ${newItem.name}.`);
					}
				}
			}
		} else {
			// Get a list which contains indexes of all possible results
			const rolltableIndexes = [];

			// Add one entry for each weight an item has
			for (let index in [...Array(rolltable.results.length).keys()]) {
				let numberOfEntries = rolltable.data.results[index].weight;
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
			while (true) {
				let usedEntries = rolltableIndexes.slice(0, shopQtyRoll.total + numberOfAdditionalItems);
				// console.log(`Distinct: ${usedEntries}`);
				let distinctEntries = [...new Set(usedEntries)];

				if (distinctEntries.length < shopQtyRoll.total) {
					numberOfAdditionalItems++;
					continue;
				}

				indexesToUse = distinctEntries;
				break;
			}

			for (const index of indexesToUse) {
				let itemQtyRoll = new Roll(itemQtyFormula);
				itemQtyRoll.roll();

				let newItem = null;

				if (rolltable.results[index].collection === "Item") {
					newItem = game.items.get(rolltable.results[index].resultId);
				} else {
					//Try to find it in the compendium
					const items = game.packs.get(rolltable.results[index].data.collection);
					newItem = await items.getDocument(rollResult.results[0].data.resultId);
				}

				newItem = await tableHelper._rollSubTables(newItem, index);

				if (!newItem || newItem === null) {
					return ui.notifications.error(MODULE.ns + `: No item found "${rolltable.results[index].resultId}".`);
				}

				if (newItem.type === "spell") {
					newItem = await Item5e.createScrollFromSpell(newItem);
				}

				await item.createEmbeddedDocuments("Item", [newItem.toObject()]);
				let existingItem = tokenActor.items.find(item => item.data.name == newItem.name);

				if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
					await existingItem.update({ "data.quantity": itemQtyLimit });
					if (!reducedVerbosity) ui.notifications.info(MODULE.ns + `: Added new ${itemQtyLimit} x ${newItem.name}.`);
				} else {
					await existingItem.update({ "data.quantity": itemQtyRoll.total });
					if (!reducedVerbosity) ui.notifications.info(MODULE.ns + `: Added new ${itemQtyRoll.total} x ${newItem.name}.`);
				}
			}
		}
	}
}
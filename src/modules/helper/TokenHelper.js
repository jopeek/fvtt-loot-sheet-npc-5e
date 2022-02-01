import Item5e from "/systems/dnd5e/module/item/entity.js";

import { MODULE } from '../data/moduleConstants.js';
import { LootProcessor } from '../classes/LootProcessor.js';
import { CurrencyHelper } from "./CurrencyHelper.js";
import { TableRoller } from "../classes/TableRoller.js";


export class TokenHelper {
	/**
	 *
	 * @param {Actor} actor
	 * @returns {String|false} a RollTable.id
	 */
	static getLinkedRolltable(actor) {
		return actor.getFlag(MODULE.ns, MODULE.flags.rolltable) || false;
	}

	/**
	 *
	 * @param {String} creatureType
	 * @returns {String|false} a RollTable.id
	 */
	static getLinkedRolltableByCreatureType(creatureType) {
		if (!creatureType || creatureType.length === 0) return false;

		try {
			const systemCreatureTypes = Object.keys(CONFIG[game.system.id.toUpperCase()]?.creatureTypes) ?? [];
			if (systemCreatureTypes.includes(creatureType)) {
				const creatureTypeKey = `creaturetype_default_${creatureType}_table`,
					fallback = game.settings.get(MODULE.ns, creatureTypeKey);

				if (fallback && fallback != 0) return fallback;
			}
		} catch (e) {
			console.error(e);
			return false;
		}

		return false;
	}

	static getDefaultFallbackRolltable() {
		return game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackRolltable) || false;
	}

	/**
	 * Converts certain documents to loot items
	 *
	 * @param {Item} item
	 * @param
	 * @returns
	 */
	static async applyItemConversions(item, conversions) {
		if (item.type === "spell") {
			item = await Item5e.createScrollFromSpell(item);
		}

		const defaultConversions = {
			Actor: {
				text: `${ite?.data?.name} Portrait`,
				img: item?.img || "icons/svg/mystery-man.svg"
			},
			Scene: {
				text: 'Map of ' + item?.data?.name,
				img: item?.data?.thumb || "icons/svg/direction.svg",
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
	 * @param {Actor|Token} target
	 *
	 *
	 * @todo this should be moved to the sheetHelper or a dedicated class
	 *
	 */
	static async populateWithRolltable(rolltable, target) {
		const actor = (!target?.actor) ? target : target.actor;
		let options = {
			customRoll: {
				shopQtyFormula: actor.getFlag(MODULE.ns, "shopQty") || game.settings.get(MODULE.ns, "fallbackShopQty") || "1",
				itemQtyFormula: actor.getFlag(MODULE.ns, MODULE.flags.itemQty) || game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackItemQty) || 1,
				itemQtyLimitFormula: actor.getFlag(MODULE.ns, "itemQtyLimit") || game.settings.get(MODULE.ns, "fallbackItemQtyLimit") || "0",
				currencyFormula: actor.getFlag(MODULE.ns, "currencyFormula") || game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackCurrencyFormula) || "",
			},
			itemOnlyOnce: actor.getFlag(MODULE.ns, "itemOnlyOnce") || false,
			tokenUuid: target.uuid,
			reducedVerbosity: game.settings.get(MODULE.ns, "reduceUpdateVerbosity") || true
		};

		let shopQtyRoll = new Roll(options.customRoll.shopQtyFormula);
		let shopRoll = await shopQtyRoll.roll();
		options.total = shopRoll.total;

		await this.addLootToTarget(target, rolltable, options);
		target.actor.sheet.render(true);
	}

	/**
	 *
	 * Rerender an {ActorSheet} if it is currently being displayed.
	 *
	 * @param {string} uuid of the sheet to be rerendered
	 * @returns
	 */
	static async handleRerender(uuid) {
		const token = await fromUuid(uuid);
		if (!token?.actor?._sheet) return;

		const sheet = token.actor.sheet,
			priorState = sheet ? sheet?._state : 0;

		console.log(`${MODULE.ns} | token Helper | handleRerender | Rerendering attempt of the actor sheet for token: ${token.name}`);

		if (sheet.rendered || priorState > 0) {
			await sheet.close();
			console.log(`${MODULE.ns} | token Helper | handleRerender | Sanity check - This state should be false: ${sheet.rendered}`);
			// Deregister the old sheet class
			token.actor._sheet = null;
			delete token.actor.apps[sheet.appId];
			await sheet.render(true, token.actor.options);
			console.log(`${MODULE.ns} | token Helper | handleRerender | Sanity check - This state should be true: ${sheet.rendered}`);
		}
	}

	/**
	 * Roll a table an add the resulting loot to a given target.
	 *
	 * @param {RollTable} table
	 * @param {Array<Actor|PlaceableObject>|Actor|PlaceableObject} stack
	 * @param {options} object
	 *
	 * @returns
	 */
	static async addLootToTarget(stack = null, table = null, options = {}) {
		let tokenstack = [];

		if (null == stack && (canvas.tokens.controlled.length === 0)) {
			return ui.notifications.error('No tokens given or selected');
		} else {
			tokenstack = (stack) ? (stack.length >= 0) ? stack : [stack] : canvas.tokens.controlled;
		}

		if (options?.verbose) ui.notifications.info(MODULE.ns + ' | API | Loot generation started for.');

		let tableRoller = new TableRoller(table);

		for (let target of tokenstack) {
			const actor = (target.actor) ? target.actor : target;
			const rollResults = await tableRoller.roll(options),
				lootProcess = new LootProcessor(rollResults, actor, options),
				betterResults = await lootProcess.buildResults(options);

			await CurrencyHelper.addCurrenciesToActor(actor, betterResults?.currency);
			lootProcess.addItemsToActor(actor, options);
		}

		if (options?.verbose) return ui.notifications.info(MODULE.ns + ' | API | Loot generation complete.');
	}
}

export const handleRerender = TokenHelper.handleRerender;
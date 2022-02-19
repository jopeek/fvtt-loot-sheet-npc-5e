import { CurrencyHelper } from "../helper/CurrencyHelper.js";
import { ActorHelper } from "../helper/ActorHelper.js";
import { MODULE } from "../data/moduleConstants.js";

export class LootSeeder {
	/**
	 * @summary Seed items to the given actor(s) inventory.
	 *
	 * @description
	 * T
	 *
	 * @module lootseedernpc5e.seedItems
	 *
	 * @param {Token|null} token
	 * @param {object} options
	 * @returns
	 */
	static async seedItemsToActors(actors = null, options = {force: false}) {
		if (!actors.length) return;

		for (const currentActor of actors) {
			//skip linked tokens
			if (!currentActor || (currentActor.data.actorLink && options.force)) continue;

			const rolltableReferences = ActorHelper.getRollTables(currentActor);
			if (!rolltableReferences || rolltableReferences.length === 0) continue;
			for (let rolltableUuid of rolltableReferences) {
				let rolltable = await fromUuid(rolltableUuid);
				if (!rolltable) {
					ui.notifications.error(MODULE.ns + `: No Rollable Table found with id "${rolltableReferences}".`);
					continue;
				}
				let customRoll = await new Roll(this._getShopQtyFormula(currentActor), currentActor.data).roll({ async: true });

				options = this._prepareOptions(options, this._getFormulas(currentActor), customRoll.total, currentActor.uuid);
				await ActorHelper.addLootToTarget(currentActor, rolltable, options);
			}
		}
	}

	/**
	 *
	 * @param {Actor} actor
	 * @returns
	 */
	static _getShopQtyFormula(actor) {
		const fallbackShopQty = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackShopQty);
		return actor.getFlag(MODULE.ns, MODULE.flags.shopQty) || fallbackShopQty || "1";
	}

	/**
	 *
	 * @param {object} options
	 * @param {object} formulas
	 * @param {string} total
	 * @param {string} uuid
	 *
	 * @returns	{object} options
	 *
	 */
	static _prepareOptions(options, formulas, total, uuid) {
		formulas.total = total;

		return mergeObject(options, {
			customRoll: formulas,
			tokenUuid: uuid,
			total: total
		});
	}

	static _getRollTables(actor) {
		const creatureType = actor.data.data.details.type.value,
			rolltableFromActor = ActorHelper.getLinkedRolltable(actor),
			rolltableByCreature = ActorHelper.getLinkedRolltableByCreatureType(creatureType),
			rolltableByFilters = ActorHelper.getLinkedRolltableByFilters(actor),
			rolltableDefault = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackRolltable) || false;

		return rolltableFromActor || rolltableByFilters || rolltableByCreature || rolltableDefault;
	}

	/**
	 * @summary Get the formulas from the actor.
	 * @description
	 *  Get the inidividualy set formulas needed to seed the loot.
	 *
	 * @param {Actor} actor
	 *
	 * @returns {object}
	 */
	static _getFormulas(actor) {
		const shopQtyFormula = actor.getFlag(MODULE.ns, MODULE.flags.shopQty) || game.settings.get(MODULE.ns, "fallbackShopQty") || "1",
			itemQtyFormula = actor.getFlag(MODULE.ns, MODULE.flags.itemQty) || game.settings.get(MODULE.ns, "fallbackItemQty") || "1",
			itemQtyLimitFormula = actor.getFlag(MODULE.ns, MODULE.flags.itemQtyLimit) || game.settings.get(MODULE.ns, "fallbackItemQtyLimit") || "0",
			currencyFormula = actor.getFlag(MODULE.ns, MODULE.flags.currencyFormula) || game.settings.get(MODULE.ns, "fallbackCurrencyFormula") || "1d3[gp]",
			formulas = { itemQtyFormula: itemQtyFormula, itemQtyLimitFormula: itemQtyLimitFormula, shopQtyFormula: shopQtyFormula, currencyFormula: currencyFormula };

			console.log(formulas);

			return formulas;
	}

}

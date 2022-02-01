import { CurrencyHelper } from "../helper/CurrencyHelper.js";
import { getLinkedRolltable , getLinkedRolltableByFilters } from "../helper/ActorHelper.js";
import { getLinkedRolltableByCreatureType } from "../helper/TableHelper.js";
import { TokenHelper } from "../helper/TokenHelper.js";
import { MODULE } from "../data/moduleConstants.js";

export class LootSeeder {
	/**
	 * @summary Seed items to the given token(s) inventory.
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
	static async seedItems(token = null, options = {}) {
		const tokenstack = (token) ? (token.length >= 0) ? token : [token] : canvas.tokens.controlled,
			fallbackShopQty = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackShopQty);
		for (const currentToken of tokenstack) {
			const tokenActor = currentToken.actor,
				shopQtyFormula = tokenActor.getFlag(MODULE.ns, MODULE.flags.shopQty) || fallbackShopQty || "1";


			let rolltableReferences = this._getRollTables(tokenActor);

			//skip linked tokens
			if (!tokenActor || currentToken.data.actorLink) continue;
			if (!rolltableReferences) return;

			let brt_currencyString = '';

			if (Array.isArray(rolltableReferences)) {
				for (let rolltableUuid of rolltableReferences) {
					let rolltable = await fromUuid(rolltableUuid);
					if (!rolltable) {
						ui.notifications.error(MODULE.ns + `: No Rollable Table found with id "${rolltableReferences}".`);
						continue;
					}
					let customRoll = await new Roll(shopQtyFormula, currentToken.data).roll();

					options = this._prepareOptions(options, this._getFormulas(tokenActor), customRoll.total, currentToken.uuid);
					await TokenHelper.addLootToTarget(currentToken, rolltable, options);
				}
			} else {
				let rolltable = await fromUuid(rolltableReferences);

				if (!rolltable) {
					return ui.notifications.error(MODULE.ns + `: No Rollable Table found with id "${rolltableReferences}".`);
				}

				let customRoll = await new Roll(shopQtyFormula, currentToken.data).roll();

				options = this._prepareOptions(options, this._getFormulas(tokenActor), customRoll.total, currentToken.uuid);

				await TokenHelper.addLootToTarget(currentToken, rolltable, options);
			}

			let currencyFlags = {
				"generateCurrency": game.settings.get(MODULE.ns, 'generateCurrency'),
				"currencyFormula": game.settings.get(MODULE.ns, 'lootCurrencyDefault'),
				"useBetterRolltables": game.settings.get(MODULE.ns, "useBetterRolltables"),
				"brt_rt_tcs": brt_currencyString,
				"adjustCurrency": game.settings.get(MODULE.ns, "adjustCurrencyWithCR")
			};

			await CurrencyHelper.handleCurrency(currentToken, currencyFlags);
		}
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
			rolltableFromActor = getLinkedRolltable(actor),
			rolltableByCreature = getLinkedRolltableByCreatureType(creatureType),
			rolltableByFilters = getLinkedRolltableByFilters(actor),
			rolltableDefault = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackRolltable) || false;

		/**
		* Todo: Method to detect how many rolltables by filter we have an if we want to use them all.
		* if we use more than one how do we prioratise? Does a rule terminate?

		* Config can hold more switches to detect if we want more than the first table.
		*/
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
			currencyFormula = actor.getFlag(MODULE.ns, MODULE.flags.currencyFormula) || game.settings.get(MODULE.ns, "fallbackCurrencyFormula") || "1d3[gp]";

		return { itemQtyFormula: itemQtyFormula, itemQtyLimitFormula: itemQtyLimitFormula, shopQtyFormula: shopQtyFormula, currencyFormula: currencyFormula };
	}

}

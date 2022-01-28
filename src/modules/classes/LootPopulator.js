import { CurrencyHelper } from "../helper/currencyHelper.js";
import { getLinkedRolltable , getLinkedRolltableByFilters } from "../helper/ActorHelper.js";
import { getLinkedRolltableByCreatureType } from "../helper/tableHelper.js";
import { TokenHelper } from "../helper/tokenHelper.js";
import { MODULE } from "../data/moduleConstants.js";

export class LootPopulator {
	/**
	 * Populate given token(s) with items from rolltables.
	 * @module lootpopulatornpc5e.populate
	 *
	 * @param {Token|null} token
	 * @param {object} options
	 * @returns
	 */
	static async populate(token = null, options = {}) {
		const tokenstack = (token) ? (token.length >= 0) ? token : [token] : canvas.tokens.controlled,
			fallbackShopQty = game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackShopQty),
			fallbackItemQtyLimit = game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackItemQtyLimit),
			fallbackItemQty = game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackItemQty),
			fallbackCurrencyFormula = game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackCurrencyFormula);

		let betterRolltablesModule = {
			ns: 'better-rolltables',
			use: game.settings.get(MODULE.ns, MODULE.settings.keys.common.useBetterRolltables) || false
		};

		betterRolltablesModule.active = game.modules.get('better-rolltables')?.active || false;

		for (const currentToken of tokenstack) {
			const tokenActor = currentToken.actor,
				shopQtyFormula = tokenActor.getFlag(MODULE.ns, MODULE.flags.shopQty) || fallbackShopQty || "1",
				itemQtyFormula = tokenActor.getFlag(MODULE.ns, MODULE.flags.itemQty) || fallbackItemQty || "0",
				itemQtyLimitFormula = tokenActor.getFlag(MODULE.ns, MODULE.flags.itemQtyLimit) || fallbackItemQtyLimit || "0",
				currencyFormula = tokenActor.getFlag(MODULE.ns, MODULE.flags.currencyFormula) || fallbackCurrencyFormula || "0";

			/**
			* Todo: Method to detect how many rolltables by filter we have an if we want to use them all.
			* if we use more than one how do we prioratise? Does a rule terminate?

			* Config can hold more switches to detect if we want more than the first table.
			*/
			let rolltableReference = this._getRollTable(tokenActor);

			//skip linked tokens
			if (!tokenActor || currentToken.data.actorLink) continue;
			if (!rolltableReference) return;

			let brt_currencyString = '';

			if (Array.isArray(rolltableReference)) {
				for (let rolltableUuid of rolltableReference) {
					let rolltable = await fromUuid(rolltableUuid);

					/**
					 * If we use BetterRolltables and the table is of a brt type, let it handle the loot
					 */
					if (
						betterRolltablesModule.use
						&& betterRolltablesModule.active
						&& rolltable.getFlag(betterRolltablesModule.ns, 'table-type')
					) {
						const betterRolltablesAPI = game.modules.get(betterRolltablesModule.ns).public.API;

						let customRoll = new Roll(shopQtyFormula),
							total = await customRoll.roll();
						const rollOptions = this._prepareOptions(this._getFormulas(tokenActor), total, currentToken.uuid);

						await betterRolltablesAPI.addLootToSelectedToken(
							rolltable,
							currentToken,
							rollOptions
						);

						// override brt_currencyString if empty
						// better solution could be to take the currency string with the highest prio - that is if we add prio
						brt_currencyString = brt_currencyString || rolltable.getFlag(betterRolltablesModule.ns, 'table-currency-string');
					} else {
						await TokenHelper.addLootToTarget(currentToken, rolltable, options);
					}
				}
			} else {
				let rolltable = await fromUuid(rolltableReference);

				if (!rolltable) {
					return ui.notifications.error(MODULE.ns + `: No Rollable Table found with id "${rolltableReference}".`);
				}

				let customRoll = await new Roll(shopQtyFormula, currentToken.data).roll();

				options = this._prepareOptions(this._getFormulas(tokenActor), customRoll.total, currentToken.uuid);

				// if we use betterRolltables and the table is of a brt type, let it handle the loot
				if (
					betterRolltablesModule.use
					&& betterRolltablesModule.active
					&& rolltable.getFlag(betterRolltablesModule.ns, 'table-type')
				) {
					const betterRolltablesAPI = game.modules.get(betterRolltablesModule.ns).public.API;
					await betterRolltablesAPI.addLootToSelectedToken(
						rolltable,
						currentToken,
						options
					);

					// override brt_currencyString if empty
					// better solution could be to take the currency string with the highest prio - that is if we add prio
					brt_currencyString = brt_currencyString || rolltable.getFlag('better-rolltables', 'table-currency-string');
				} else {
					await TokenHelper.addLootToTarget(currentToken, rolltable, options);
				}
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
	 * @param {Actor} actor
	 * @param {object} formulas
	 * @param {string} total
	 * @param {string} uuid
	 *
	 * @returns	{object} options
	 *
	 */
	static _prepareOptions(formulas, total, uuid) {
		formulas.total = total;

		return {
			customRoll: formulas,
			tokenUuid: uuid,
			total: total
		};
	}

	static _getRollTable(actor) {
		const creatureType = actor.data.data.details.type.value,
			rolltableFromActor = getLinkedRolltable(actor),
			rolltableByCreature = getLinkedRolltableByCreatureType(creatureType),
			rolltableByFilters = getLinkedRolltableByFilters(currentToken),
			rolltableDefault = game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackRolltable) || false;

		/**
		* Todo: Method to detect how many rolltables by filter we have an if we want to use them all.
		* if we use more than one how do we prioratise? Does a rule terminate?

		* Config can hold more switches to detect if we want more than the first table.
		*/
		return rolltableFromActor || rolltableByFilters || rolltableByCreature || rolltableDefault;
	}

	/**
	 *
	 * @param {Actor} actor
	 *
	 * @returns {object}
	 */
	static _getFormulas(actor) {
		const shopQtyFormula = actor.getFlag(MODULE.ns, MODULE.flags.shopQty) || fallbackShopQty || "1",
			itemQtyFormula = actor.getFlag(MODULE.ns, MODULE.flags.itemQty) || fallbackItemQty || "0",
			itemQtyLimitFormula = actor.getFlag(MODULE.ns, MODULE.flags.itemQtyLimit) || fallbackItemQtyLimit || "0",
			currencyFormula = actor.getFlag(MODULE.ns, MODULE.flags.currencyFormula) || fallbackCurrencyFormula || "0";

		return { itemQtyFormula: itemQtyFormula, itemQtyLimitFormula: itemQtyLimitFormula, shopQtyFormula: shopQtyFormula, currencyFormula: currencyFormula };
	}

}

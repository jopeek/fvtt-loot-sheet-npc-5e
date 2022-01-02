import { currencyHelper } from "../helper/currencyHelper.js";
import { tokenHelper } from "../helper/tokenHelper.js";
import { MODULE } from "../data/config.js";

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
			betterRolltablesModule = {
				ns: 'better-rolltables',
				use: game.settings.get(MODULE.ns, MODULE.settings.keys.common.useBetterRolltables) || false
			};

		for (const currentToken of tokenstack) {
			const tokenActor = currentToken.actor,
				creatureType = tokenActor.data.data.details.type.value,
				shopQtyFormula = tokenActor.getFlag(MODULE.ns, MODULE.flags.shopQty) || fallbackShopQty || "1",
				itemQtyLimit = tokenActor.getFlag(MODULE.ns, MODULE.flags.itemQtyLimit) || fallbackItemQtyLimit || "0",
				rolltableFromActor = tokenHelper.getLinkedRolltable(currentToken),
				rolltableByCreature = tokenHelper.getLinkedRolltableByCreatureType(creatureType),
				rolltableByFilters = tokenHelper.getLinkedRolltableByFilters(currentToken),
				rolltableDefault = tokenHelper.getDefaultFallbackRolltable();

			/**
			* Todo: Method to detect how many rolltables by filter we have an if we want to use them all.
			* if we use more than one how do we prioratise? Does a rule terminate?

			* Config can hold more switches to detect if we want more than the first table.
			*/
			let rolltableReference = rolltableFromActor || rolltableByFilters || rolltableByCreature || rolltableDefault;

			//skip linked tokens
			if (!tokenActor || currentToken.data.actorLink) continue;
			if (!rolltableReference) return ui.notifications.error(MODULE.ns + `: No Rolltable was found on the actor or in the module defaults.`);

			let brt_currencyString = '';

			if (Array.isArray(rolltableReference)) {
				for (let rolltableUuid of rolltableReference) {
					let rolltable = await fromUuid(rolltableUuid);
					const hasBetterRolltableType = rolltable.getFlag(betterRolltablesModule.ns, 'table-type') || false;

					/**
					 * If we use BetterRolltables and the table is of a brt type, let it handle the loot
					 */
					if (
						betterRolltablesModule.use
						&& hasBetterRolltableType
						) {
							const betterRolltablesAPI = game.modules.get(betterRolltablesModule.ns).public.API;

							let customRoll = new Roll(shopQtyFormula);
            				customRoll.roll();

							options.customRole = customRoll.total;
							options.itemQtyLimit = itemQtyLimit;

							await betterRolltablesAPI.addLootToSelectedToken(
									rolltable,
									currentToken,
									options
								);

						// override brt_currencyString if empty
						// better solution could be to take the currency string with the highest prio - that is if we add prio
						brt_currencyString = brt_currencyString || rolltable.getFlag(betterRolltablesModule.ns, 'table-currency-string');
					} else {
						await tokenHelper.populateWithRolltable(rolltable, currentToken);
					}
				}
			} else {
				let rolltable = await fromUuid(rolltableReference);
				const hasBetterRolltableType = rolltable.getFlag(betterRolltablesModule.ns, 'table-type') || false;

				if (!rolltable) {
					return ui.notifications.error(MODULE.ns + `: No Rollable Table found with id "${rolltableReference}".`);
				}

				// if we use betterRolltables and the table is of a brt type, let it handle the loot
				if (
					betterRolltablesModule.use
					&& hasBetterRolltableType
					) {
						const betterRolltablesAPI = game.modules.get(betterRolltablesModule.ns).public.API;
						let customRoll = new Roll(shopQtyFormula);
						customRoll.roll();

						options.customRole = customRoll.total;
						options.itemQtyLimit = itemQtyLimit;
						await betterRolltablesAPI.addLootToSelectedToken(
								rolltable,
								currentToken,
								options
							);

					// override brt_currencyString if empty
					// better solution could be to take the currency string with the highest prio - that is if we add prio
					brt_currencyString = brt_currencyString || rolltable.getFlag('better-rolltables', 'table-currency-string');
				} else {
					await tokenHelper.populateWithRolltable(rolltable, currentToken);
				}
			}

			let currencyFlags = {
				"generateCurrency": game.settings.get(MODULE.ns, 'generateCurrency'),
				"lootCurrencyDefault": game.settings.get(MODULE.ns, 'lootCurrencyDefault'),
				"useBetterRolltables": game.settings.get(MODULE.ns, "useBetterRolltables"),
				"brt_rt_tcs": brt_currencyString,
				"adjustCurrency": game.settings.get(MODULE.ns, "adjustCurrencyWithCR")
			};

			await currencyHelper.handleCurrency(currentToken, currencyFlags);
		}
	}
}

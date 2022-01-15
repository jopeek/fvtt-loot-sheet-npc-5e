import Item5e from "/systems/dnd5e/module/item/entity.js";

import { MODULE } from '../data/moduleConstants.js';
import { tableHelper } from "../helper/tableHelper.js";
import { API } from "../api/API.js";

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
            if (this._passesFilter(token.actor, filterRules[key].filters)) {
                if (!rolltable) rolltable = [];

                rolltable.push(filterRules[key].rolltable);
            }
        }

        return rolltable;
    }

    /**
	 * @summary Check if the given subject passes the given filters
	 *
     * @description
	 * Applies the given _filter_**s** on the given _subject_'s data properties.
	 * If a property defined in filters is **not present** on the _subject_,
	 * the the subject **doesn't pass** the _filter_.
	 *
	 * If a property defined in the _filter_ is **present** on the _subject_,
	 * The _subject_.property value is checked according to _filter_.comparison
	 * againt a _filter_.value
	 *
	 *
     * @param {object} subject
     * @param {object} filters
     *
     * @returns {boolean}
	 *
	 * @author Daniel Böttner <@DanielBoettner>
	 *
	 * @version 1.0.1
	 * @since 3.4.5.3
	 *
	 * @inheritdoc
	 * @function
	 * @static
     */
    static _passesFilter(subject, filters) {
        for (let filter of Object.values(filters)) {
            let prop = getProperty(subject, `data.${filter.filterpath}`) || getProperty(subject, filter.filterpath);
            if (prop === undefined) return false;
            switch (filter.comparison) {
                case '==': if (prop == filter.value) { return true; } break;
                case '<=': if (prop <= filter.value) { return true; } break;
                case '>=': if (prop >= filter.value) { return true; } break;
                case 'includes': if (prop.includes(filter.value)) { return true; } break;
				default:
					return false;
            }
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
			  text: `${ite?.data?.name} Portrait`,
			  img: item?.img || "icons/svg/mystery-man.svg"
			},
			Scene: {
			  text: 'Map of '+ item?.data?.name,
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
	 * @param {TokenDocument} token
	 *
	 */
	static async populateWithRolltable(rolltable, token) {
		const tokenActor = token.actor;
		let options = {
				customRole: {
					shopQtyFormula: tokenActor.getFlag(MODULE.ns, "shopQty") || game.settings.get(MODULE.ns, "fallbackShopQty") || "1",
					itemQtyFormula: tokenActor.getFlag(MODULE.ns, MODULE.flags.itemQty) || game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackItemQty)|| 1,
					itemQtyLimitFormula: tokenActor.getFlag(MODULE.ns, "itemQtyLimit") || game.settings.get(MODULE.ns, "fallbackItemQtyLimit") || "0",
					currencyFormula: tokenActor.getFlag(MODULE.ns, "currencyFormula") || game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackCurrencyFormula) || "",
				},
				itemOnlyOnce: tokenActor.getFlag(MODULE.ns, "itemOnlyOnce") || false,
				tokenUuid: token.uuid,
            	reducedVerbosity: game.settings.get(MODULE.ns, "reduceUpdateVerbosity") || true
			};

		let shopQtyRoll = new Roll(options.customRole.shopQtyFormula);
		let shopRoll = await shopQtyRoll.roll();
		options.total = shopRoll.total;

		await API.addLootToSelectedToken(token, rolltable, options);
		token.actor.sheet.render(true);
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
			await sheet.render();
			console.log(`${MODULE.ns} | token Helper | handleRerender | Sanity check - This state should be true: ${sheet.rendered}`);
		}
	}
}
import { MODULE } from "../data/moduleConstants.js";

export class CurrencyHelper {

    /**
     *
     * @param actor
     * @param rolltable
     * @param flags
     * @param generateCurrency
     * @param lootCurrencyDefault
     * @param useBTR
     */
    static async handleCurrency(
        token,
        flags
    ) {
        if (flags.generateCurrency && flags.lootCurrencyDefault) {
            let lootCurrencyString = flags.lootCurrencyDefault;

            /**
            * If we use betterRolltable and the currencyString of BRT is not empty
            * the currency was already populated.
            */
            if (
                flags.useBetterRolltables &&
                (flags.brt_rt_tcs !== undefined || flags.brt_rt_tcs?.length > 0)
            ) {
                return;
            }

            await this.addCurrenciesToActor(
                token.actor,
                this.generateCurrency(lootCurrencyString),
                flags.adjustCurrency
            );
        }
    }

    /**
     * @summary Generate a currencyObject
     * @description
     * Generate a currencyObject `{object}` for the given currencyString `{string}`
     *
     * @example
     * Input: '1d6[pp] + 1d6[gp] + 1d6[ep]+ 1d6[sp] + 1d6[cp]'
     * Output:  `{ pp: 3, gp: 4, ep: 6, sp: 1, cp: 2 }`
     *
     * @param {String} currencyString
     *
     * @returns {object} currencyObject
     *
     * @author Samir <@ultrakorne>
     * @since 3.4.5.2
     *
     * @inheritdoc
     * @function
     */
    static async generateCurrency(currencyString) {
        let currenciesToAdd = {};

        if (currencyString) {
            const currenciesPieces = currencyString.split(",");

            for (const currencyPiece of currenciesPieces) {
                const match = /(.*)\[(.*?)\]/g.exec(currencyPiece); //capturing 2 groups, the formula and then the currency symbol in brakets []

                if (!match || match.length < 3) {
                    ui.notifications.warn(MODULE.ns + ` | Currency loot field contain wrong formatting, currencies need to be define as "diceFormula[currencyType]" => "1d100[gp]" but was ${currencyPiece}`);
                    continue;
                }

                const rollFormula = match[1];
                const currency = match[2];
                const amount = await CurrencyHelper.tryRoll(rollFormula);
                currenciesToAdd[currency] = (currenciesToAdd[currency] || 0) + amount;
            }
        }

        return currenciesToAdd;
    }

    /**
     * Expects and actor and an an array with currency types and values
     *
     * @param {Actor} actor
     * @param {Array} lootCurrency
     * @param {boolean} adjutsByCR
     */
    static async addCurrenciesToActor(actor, lootCurrency, adjutsByCR = false) {
        const currencyDataInitial = { cp: 0, ep: 0, gp: 0, pp: 0, sp: 0 };
        let currencyData = currencyDataInitial;

        lootCurrency = lootCurrency || game.settings.get(MODULE.ns, 'lootCurrencyDefault');

        if (actor.data.data.currency) {
            currencyData = duplicate(actor.data.data.currency);
        }

        for (let key in lootCurrency) {
            if (currencyData.hasOwnProperty(key)) {
                if (adjutsByCR) {
                    let cr = game.actors.find(a => a._id === actor.data.actorId).data.data.details.cr || 0;
                    currencyData[key] = Number(currencyData[key] || 0) + Number(Math.ceil(cr * lootCurrency[key]));
                } else {
                    currencyData[key] = Number(currencyData[key] || 0) + Number(lootCurrency[key]);
                }
            }
        }

        await actor.update({ 'actorData.data.currency': currencyData });
    }

    /**
       *
       * @param {string} rollFormula
       * @returns
       */
    static async tryRoll(rollFormula) {
        try {
            return (await (new Roll(rollFormula)).roll({ async: true })).total || 1;
        } catch (error) {
            console.error(MODULE.ns + ' | currencyHelper :', error);
            return 1;
        }
    }

    /**
     * Splits the values of a type in the stack between splitBy
     *
     * @param {object} stack
     * @param {number} splitBy
     *
     * @returns {Array<object>} Array with
     */
    static getSharesAndRemainder(stack, splitBy) {
        let shares = [],
            remainder = {};

        for (let type in stack) {
            shares[type] = Math.floor(stack[type] / splitBy);
            remainder[type] = shares[type] % splitBy;
        }

        return [shares, remainder];
    }

    /**
     * @summary Get the split by observers for the given currency
     *
     * @description
     * Get the actors funds. Devide each type of currency by the number of observers.
     * If the number of observers is 1 (length o observers array is 0), the currency is not split.
     *
     * @param {Actor} actor
     * @param {number} observers
     *
     * @returns {Array}
     */
    static getSplitByObservers(currencies, observers = 1) {
        let split = duplicate(currencies);
        if (observers == 0) return split;

        for (let currency in split) {
            let currenSplit = split[currency] ?? 0;
            split[currency] = Math.floor(currenSplit / observers);
        }

        return split;
    }

    /**
    * @description
    * This is backwords support for currency.TYPE.value.
    *
    * @param {object} currencies
    * @return {object} currencies
    *
    * @version 1.0.1
    *
    * @author Jan Ole Peek <@jopeek>
    */
    static handleActorCurrency(currencies) {
        Object.entries(currencies).map(([type, currency]) => {
            let value = currency.value ?? currency;
            currencies[type] = Number(value);
        });

        return currencies;
    }
}
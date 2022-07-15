import { MODULE } from "../data/moduleConstants.js";
import { Converter } from "../data/dnd/currency";
import { Currencies, CurrencyObject, CurrencyRates, LootSheetActorFlags } from "../../../types/index.js";

export class CurrencyHelper {

    /**
     * @summary Returns a zeroed CurrencyObject
     * 
     * @uses CurrencyRates object to create the keys.
     * @returns zeroed CurrencyObject
     */
    public static blankCurrency(): CurrencyObject {
        let currency: CurrencyObject = {};

        for (const key in this.getRates()) {
            currency[key] = 0;
        }

        return currency;
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
     * @returns {CurrencyObject} currencyObject
     *
     * @author Samir <@ultrakorne>
     * @since 3.4.5.2
     *
     * @version 2.0.0
     * 
     * @inheritdoc
     * @function
     */
    static async generateCurrency(currencyString: string): Promise<CurrencyObject> {
        let currenciesToAdd: CurrencyObject = {};

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
     */
    static async addCurrenciesToActor(
        actor: Actor,
        lootCurrency: CurrencyObject
    ) {
        // @ts-ignore
        const adjutsByCR: boolean = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.adjustCurrencyWithCR),
            currencyDataInitial: CurrencyObject = { cp: 0, ep: 0, gp: 0, pp: 0, sp: 0 };
        let currency = this.blankCurrency();

        lootCurrency = lootCurrency || game.settings.get(MODULE.ns, 'lootCurrencyDefault');

        if (actor.data.data.currency) {
            currency = duplicate(actor.data.data.currency);
        }

        for (let key in lootCurrency) {
            if (currency.hasOwnProperty(key)) {
                if (adjutsByCR) {
                    // @ts-ignore
                    let cr = game.actors.find(a => a._id === actor.data.actorId).data.data.details.cr || 0.25;
                    currency[key] = Number(currency[key] || 0) + Number(Math.ceil(cr * lootCurrency[key]));
                } else {
                    currency[key] = Number(currency[key] || 0) + Number(lootCurrency[key]);
                }
            }
        }

        await actor.update({ 'data.currency': currency });
    }

    /**
       *
       * @param {string} rollFormula
       * @returns
       */
    static async tryRoll(rollFormula: string) {
        try {
            return (await (new Roll(rollFormula)).roll({ async: true })).total || 1;
        } catch (error) {
            console.error(MODULE.ns + ' | currencyHelper :', error);
            return 1;
        }
    }

    /**
     * @summary get the funds as platinum value
     *
     * @param {object} funds
     * @returns {string}
     *
     * @author Jan Ole Peek < @jopeek >
     * @version 1.0.0
     *
     */
    public static getFundsAsPlatinum(funds: CurrencyObject) {
        console.warn(MODULE.ns, '| getFundsAsPlatinum | funds |', funds);
        let fundsAsPlatinum = funds.pp;

        for (let type in funds) {
            if (type !== 'pp') {
                fundsAsPlatinum += funds[type] * CurrencyHelper.getRates()[type].pp.rate;
            } else {
                fundsAsPlatinum += funds[type];
            }
        }   
        return fundsAsPlatinum;
        //console.log(`${MODULE.ns} | _getFundsAsPlatinum | funds: `, funds, rates);
        console.log(`${MODULE.ns} | _getFundsAsPlatinum | fundsAsPlatinum: `, fundsAsPlatinum);
        return fundsAsPlatinum || 0;
    }

    /**
     * 
     * @param amount coin value to convert 
     * @param sourceType source currency type
     * @param currencyObject 
     * @param desiredCoins 
     * @returns void
     */       
    public static exchange(
        amount: number,
        sourceType: string,
        currencyObject: CurrencyObject,
        desiredCoins: string[] = []
    ): CurrencyObject {
        let remainingCoins = amount,
            rates = CurrencyHelper.getRates();

        for (const highestCoinType in rates) {
            if (desiredCoins.length && !desiredCoins.includes(highestCoinType)) {
                continue;
            }

            if (sourceType === highestCoinType) {
                currencyObject[sourceType] += remainingCoins;
            } else {
                const quotient = Math.floor(CurrencyHelper._calculateCoin(remainingCoins, highestCoinType, sourceType));
                remainingCoins = CurrencyHelper._calculateModCoin(remainingCoins, highestCoinType, sourceType);
                currencyObject[highestCoinType] += quotient;
            }
        }

        return currencyObject;
    }

    /**
     * Splits the values of a type in the stack between splitBy
     *
     * @param {object} stack
     * @param {number} splitBy
     *
     * @returns {Array<object>} Array with
     */

    static getSharesAndRemainder(
        stack: CurrencyObject,
        splitBy: number
    ): { currencyShares: CurrencyObject, remainder: CurrencyObject } {
        let shares: CurrencyObject = {},
            remainder: CurrencyObject = {};

        for (let type in stack) {
            shares[type] = Math.floor(stack[type] / splitBy);
            remainder[type] = shares[type] % splitBy;
        }

        return { currencyShares: shares, remainder: remainder };
    }

    /**
     * @summary Get the split by observers for the given currency
     *
     * @description
     * Get the actors funds. Devide each type of currency by the number of observers.
     * If the number of observers is 1 (length o observers array is 0), the currency is not split.
     *
     * @param {number} observers
     *
     * @returns {Array}
     */
    static getSplitByObservers(
        currencies: CurrencyObject,
        observers: number = 1
    ) {
        let split: CurrencyObject = duplicate(currencies);
        if (observers <= 1) return split;

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
    * @param {object} currency
    * @return {object} currency
    *
    * @version 1.0.2
    *
    * @author Jan Ole Peek <@jopeek>
    */
    static cleanCurrency(originalCurrency: CurrencyObject): CurrencyObject {
        let cleaned: CurrencyObject = {};

        for (const coin in originalCurrency) {
            if (originalCurrency[coin] > 0) {
                cleaned[coin] = Number(originalCurrency[coin]);
            } else {
                cleaned[coin] = 0;
            }
        }

        return cleaned;
    }

    /**
     *
     * @param {object} priceInBaseCurrency
     **/
    static getCostObject(priceInBaseCurrency: number): CurrencyObject {
        const rates = CurrencyHelper.getRates();
        let costObject: CurrencyObject = {};
        for (const key in rates) {
            const conversion = rates[key]['gp'];

            if (!Number.isInteger(priceInBaseCurrency * conversion.rate)) continue;
            costObject[key] = Math.floor(priceInBaseCurrency * conversion.rate);
        }

        return costObject;
    }

    /**
     * @summary Get the value of currency in another currency
     * 
     * @param value the 
     * @param value  
     * @param targetCurrency 
     * @param sourceCurrency 
     * @returns 
     */
    public static _calculateCoin(
        value: number,
        targetCurrency: string,
        sourceCurrency: string
    ) {
        const rates = CurrencyHelper.getRates(),
            coinRate = rates[sourceCurrency][targetCurrency].rate;
        return (value * coinRate);
    }
    /**
     * @summary Calculates the remainder of a coin after it has been divided by a number of coins.
     * @param amount The amount of coins to divide.
     * @param targetCurrency The currency type to divide the amount into.
     * @param sourceCurrency The currency type to divide the amount from.
     * 
     * @returns The remainder of the coin after it has been divided.
     */
    public static _calculateModCoin(
        amount: number,
        targetCurrency: string,
        sourceCurrency: string
    ) {
        const rates = CurrencyHelper.getRates(),
            rateLabel = rates[sourceCurrency][targetCurrency].label,
            denominator = CurrencyHelper.getDenominatorFromRate(rateLabel);
        return (amount % denominator);
    }

    /**
     * Returns the denominator if the rate label has a denominator.
     * 
     * @param { string } label 
     * 
     * @returns denominator { number | 1 } 
     */
    public static getDenominatorFromRate(
        label: string
    ): number {
        const denominator = '/';
        return (label.includes(denominator)) ? parseInt(label.split(denominator)[1]) : 1;
    }

    static getRates(): CurrencyRates {
        return {
            "pp": {
                "cp": {
                    "rate": 1000,
                    "label": "1000"
                },
                "sp": {
                    "rate": 100,
                    "label": "100"
                },
                "ep": {
                    "rate": 20,
                    "label": "20"
                },
                "gp": {
                    "rate": 10,
                    "label": "10"
                },
                "pp": {
                    "rate": 1,
                    "label": "1"
                }
            },
            "gp": {
                "cp": {
                    "rate": 100,
                    "label": "100"
                },
                "sp": {
                    "rate": 10,
                    "label": "10"
                },
                "ep": {
                    "rate": 2,
                    "label": "2"
                },
                "gp": {
                    "rate": 1,
                    "label": "1"
                },
                "pp": {
                    "rate": 0.1,
                    "label": "1/10"
                }
            },
            "ep": {
                "cp": {
                    "rate": 50,
                    "label": "50"
                },
                "sp": {
                    "rate": 5,
                    "label": "5"
                },
                "ep": {
                    "rate": 1,
                    "label": "1"
                },
                "gp": {
                    "rate": 0.5,
                    "label": "1/2"
                },
                "pp": {
                    "rate": 0.05,
                    "label": "1/20"
                }
            },
            "sp": {
                "cp": {
                    "rate": 10,
                    "label": "10"
                },
                "sp": {
                    "rate": 1,
                    "label": "1"
                },
                "ep": {
                    "rate": 0.2,
                    "label": "1/5"
                },
                "gp": {
                    "rate": 0.1,
                    "label": "1/10"
                },
                "pp": {
                    "rate": 0.01,
                    "label": "1/100"
                }
            },
            "cp": {
                "cp": {
                    "rate": 1,
                    "label": "1"
                },
                "sp": {
                    "rate": 0.1,
                    "label": "1/10"
                },
                "ep": {
                    "rate": 0.02,
                    "label": "1/50"
                },
                "gp": {
                    "rate": 0.01,
                    "label": "1/100"
                },
                "pp": {
                    "rate": 0.001,
                    "label": "1/1000"
                }
            }
        }
    }
}
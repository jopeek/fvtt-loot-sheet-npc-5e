export default class CurrencyCalculator {
    /**
     * Base class for calculation for currencies. .
     *
     *
     */

    actorCurrency(actor) {
        return actor.data.data.currency;
    }

    price() {
        console.log("Base");
    }
}

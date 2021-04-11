import CurrencyCalculator from "./CurrencyCalculator.js";

export default class SwadeCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor) {
        return buyer.data.data.details.currency;
    }

    price() {
        console.log("swade");
    }
}

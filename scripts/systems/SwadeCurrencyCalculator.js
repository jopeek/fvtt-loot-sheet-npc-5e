import CurrencyCalculator from "./CurrencyCalculator.js";

export default class SwadeCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor) {
        return actor.data.data.details.currency;
    }

    updateActorWithNewFunds(buyer, buyerFunds) {
        buyer.update({ "data.details.currency": buyerFunds });
    }
}

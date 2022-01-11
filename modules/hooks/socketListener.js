import { MODULE } from "../data/moduleConstants.js";
import { ItemHelper } from "../helper/ItemHelper.js";
import { tokenHelper } from "../helper/tokenHelper.js";

export class socketListener {
    static async handleRequest(data) {
        const triggeringActor = game.actors.get(data.triggerActorId),
            action = data.action;

        console.log(MODULE.ns + " | Hooks | socketListener | data", data);

        if (!action || action === "error") {
            const msg = data.message || " | socketListener | InvalidData ";
            ui.notifications.error(MODULE.ns + ' | ' + msg);
            console.log("Loot Sheet | Transaction Error: ", data);
            return;
        }

        if (action === 'sheetUpdate') {
            //re render the sheet for the token.
            return tokenHelper.handleRerender(data.tokenUuid);
        }

        if (!triggeringActor) {
            ui.notifications.error(MODULE.ns + " | socketListener | Exception | Could not get acting player.");
            return;
        }

        if (game.user.isGM && data.processorId === game.user.id) {
            const targetToken = await fromUuid(data.tokenUuid);
            if(!targetToken)
                return ui.notifications.error(MODULE.ns + " | socketListener | Exception | Could not find a token with the uuid: " + data.tokenUuid);
            if (action === "buyItem") {
                ItemHelper.transaction(targetToken.actor, triggeringActor, data.targetItemId, data.quantity);
            }
            if (action === "tradeItems") {
                ItemHelper.trade(targetToken.actor, triggeringActor, data.trades);
            }
            if (action === "lootAll") {
                ItemHelper.lootAllItems(targetToken, triggeringActor);
            }
            if (action === "lootItem") {
                let items = [{ id: data.targetItemId, data: { data: { quantity: data.quantity } } }];
                ItemHelper.lootItems(targetToken, triggeringActor, items);
            }
            if (action === "distributeCurrency") {
                ItemHelper.distributeCoins(targetToken.actor);
            }
            if (action === "lootCurrency") {
                ItemHelper.lootCurrency(targetToken.actor, triggeringActor);
            }
        }
    }
}

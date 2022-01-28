import { MODULE } from "../data/moduleConstants.js";
import { TradeHelper } from "../helper/TradeHelper.js";

/**
 * @module LootSheetNPC5e.Hooks.SocketListener
 *
 * @description The modules generic SocketListener
 *
 * @exposes {SocketListener.handleRequest}
 * @author Daniel Böttner <@DanielBoettner>
 * @version 1.0.0
 * @since 3.4.5.3
 *
 * @uses module:data/moduleConstants
 * @uses module:helper/tokenHelper
 * @uses module:helper/TradeHelper
 *
 */
export class SocketListener {

    /**
     * @summary Handle the incoming request packet
     * @description This is the main socket listener method.
     *
     * @example
     *
     * ```js
     * const packet = {
     *   action: string,
     *   triggerActorId: string,
     *   [...]
     * };
     * await SocketListener.handleRequest(packet);
     * ```
     * @param {object} packet
     * @returns {Promise<void>}
     */
    static async handleRequest(packet) {
        const triggeringActor = game.actors.get(packet.triggerActorId),
            action = packet.action || packet;

        console.log(`${MODULE.ns} | {this.name} | data`, packet);

        if (action === "error") {
            const msg = packet.message || " | socketListener | InvalidData ";
            ui.notifications.error(MODULE.ns + ' | ' + msg);
            console.log(`${MODULE.ns} | ${handleRequest.name} | Transaction Error: `, packet);
            return;
        }

        if (action === 'sheetUpdate') {
            //re render the sheet for the token.
            return this._handleRerender(packet.tokenUuid);
        }

        if (!triggeringActor) {
            ui.notifications.error(`${MODULE.ns} | ${handleRequest.name} | Exception | Could not get triggering user character. See console. (F12)`);
            console.error(`${MODULE.ns} | ${handleRequest.name} | Exception | Could not get triggering game.user`, packet);
            return;
        }

        if (game.user.isGM && packet.processorId === game.user.id) {
            const targetToken = await fromUuid(packet.tokenUuid);
            if (!targetToken)
                return ui.notifications.error(MODULE.ns + " | socketListener | Exception | Could not find a token with the uuid: " + packet.tokenUuid);

            // prepare the options object
            const options = {
                priceModifier: packet.priceModifier,
                quantity: packet.quantity,
                verbose: packet?.verbose,
                chatOutPut: true
            };

            // check the action type and call the apprpriate function
            switch (action) {
                case "buyItem":
                    await TradeHelper.transaction(targetToken.actor, triggeringActor, packet.targetItemId, packet.quantity, options);
                    break;
                case "tradeItems":
                    await TradeHelper.tradeItems(targetToken.actor, triggeringActor, packet.trades, options);
                    return this._handleRerender(packet.tokenUuid);
                case "lootAll":
                    await TradeHelper.lootAllItems(targetToken, triggeringActor);
                    break;
                case "lootItem":
                    let items = [{ id: packet.targetItemId, data: { data: { quantity: packet.quantity } } }];
                    await TradeHelper.lootItems(targetToken, triggeringActor, items, options);
                    break;
                case "distributeCurrency":
                    await TradeHelper.distributeCurrency(targetToken.actor, options);
                    break;
                case "lootCurrency":
                    await TradeHelper.lootCurrency(targetToken.actor, triggeringActor);
                    break;
                case 'sheetUpdate':                //re render the sheet for the token.
                    return this._handleRerender(packet.tokenUuid);
                default:
                    console.log(`${MODULE.ns} | socketListener | Info | listend to an unhandled action: ${action}`);
            }
        }
    }

    /**
	 *
	 * Rerender an {ActorSheet} if it is currently being displayed.
	 *
	 * @param {string} uuid of the sheet to be rerendered
	 * @returns
	 */
	static async _handleRerender(uuid) {
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
			await sheet.render(true, token.actor.options);
			console.log(`${MODULE.ns} | token Helper | handleRerender | Sanity check - This state should be true: ${sheet.rendered}`);
		}
	}
}

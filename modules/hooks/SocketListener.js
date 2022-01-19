import { MODULE } from "../data/moduleConstants.js";
import { tokenHelper } from "../helper/tokenHelper.js";
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
            console.log(`${MODULE.ns} | ${this.name} | Transaction Error: `, packet);
            return;
        }

        if (action === 'sheetUpdate') {
            //re render the sheet for the token.
            return tokenHelper.handleRerender(packet.tokenUuid);
        }

        if (!triggeringActor) {
            ui.notifications.error(`${MODULE.ns} | ${this.name} | Exception | Could not get triggering user character. See console. (F12)`);
            console.error(`${MODULE.ns} | ${this.name} | Exception | Could not get triggering game.user`, packet);
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
                    return tokenHelper.handleRerender(packet.tokenUuid);
                case "lootAll":
                    await TradeHelper.lootAllItems(targetToken, triggeringActor);
                    break;
                case "lootItem":
                    let items = [{ id: packet.targetItemId, data: { data: { quantity: packet.quantity } } }];
                    await TradeHelper.lootItems(targetToken, triggeringActor, items, options);
                    break;
                case "distributeCurrency":
                    await TradeHelper.distributeCoins(targetToken.actor, options);
                    break;
                case "lootCurrency":
                    await TradeHelper.lootCurrency(targetToken.actor, triggeringActor);
                    break;
                case 'sheetUpdate':                //re render the sheet for the token.
                    return tokenHelper.handleRerender(packet.tokenUuid);
                default:
                    console.log(`${MODULE.ns} | socketListener | Info | listend to an unhandled action: ${action}`);
            }
        }
    }
}

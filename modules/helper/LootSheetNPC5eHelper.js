import { PermissionHelper } from "./PermissionHelper.js";
import { MODULE } from "../data/moduleConstants.js";
import { QuantityDialog } from "../classes/quantityDialog.js";
import { ItemHelper } from "../helper/ItemHelper.js";

/**
 * @Module LootSheetNPC5e.Helpers.LootSheetNPC5eHelper
 *
 * @description Helper Methods for the Loot Sheet NPC 5e Module
 */
class LootSheetNPC5eHelper {

    /**
     * @Module LootSheetNPC5e.Helpers.LootSheetNPC5eHelper.changeSheetType
     *
     * @description Change the {Actor5e}'s sheet type flag
     *
     * @param {Actor5e} actor
     * @param {Event} event
     *
     */
    static async changeSheetType(event, actor) {
        event.preventDefault();
        const selectedIndex = event.currentTarget.selectedIndex,
            selectedItem = event.currentTarget[selectedIndex].value;

        await actor.setFlag(MODULE.ns, "lootsheettype", selectedItem);
        console.log(MODULE.ns + " | " + game.user.name + ' (' + game.user.id + ') updated the sheet type for ', MODULE.ns + " event | " + event);
        // tell everyone that the sheet has changed.

        debugger;
        this.sendActionToSocket(actor.token, event);
        actor.sheet.render(true);
    }

    /**
     * Wrapper to call the itemHelper.getLootableItems
     *
     * @param {Array<object>} items
     * @param {number} chanceOfDamagedItems
     * @param {number} damagedItemsMultiplier
     * @param {number} removeDamagedItems
     *
     * @returns {Array<Items>} items Filtered lootable items
     */
    static getLootableItems(items, options) {
        return ItemHelper.getLootableItems(items, options);
    }

    /**
     * @module LootSheetNPC5e.Helpers.LootSheetNPC5eHelper.sendActionToSocket
     *
     * @description Send an action to the socket
     *
     * @param {Token} containerActor
     * @param {Event} event
     *
     * @returns
     */
    static sendActionToSocket(token, event) {
        event.preventDefault();
        if (!game.settings.get(MODULE.ns, event.currentTarget.dataset.action)) {
            return;
        }
        const
            targetGm = PermissionHelper.getTargetGM(),
            action =  event.currentTarget.dataset.action,
            dataSet = { ...event.currentTarget.dataset, ...event.currentTarget.closest('.item')?.dataset },
            targetItemId = dataSet?.itemId,
            options = { acceptLabel: "Quantity" },
            maxQuantity = parseInt(dataSet?.maxQuantity);
        let quantity = 1;

        // if (!targetGm) return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to loot coins.");
        if (token === null) return ui.notifications.error("You must `" + action + "` from a token.");
        if (!game.user.actorId && !game.user.isGM ) return ui.notifications.error(`No active character for user.`);

        const packet = {
            action: action,
            triggerActorId: game.user.actorId || null,
            tokenUuid: token.uuid,
            processorId: targetGm.id,
            targetItemId: targetItemId || null,
            quantity: quantity || null
        };

        if (action == MODULE.settings.keys.sheet.sheetUpdate) {
                game.socket.emit(MODULE.socket, packet)
                return;
        }

        if (event.shiftKey || dataSet?.getAll === 'true') {
            packet.quantity = maxQuantity;
            game.socket.emit(MODULE.socket, packet);
        } else {
            options.max = maxQuantity;
            const d = new QuantityDialog((quantityCallback) => {
                packet.quantity = quantityCallback;
                game.socket.emit(MODULE.socket, packet);
            },
                options
            );
            d.render(true);
        }
    }
}
export { LootSheetNPC5eHelper };
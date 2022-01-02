import { PermissionHelper } from "./PermissionHelper.js";
import { MODULE } from "../data/config.js";
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
        //actor.sheet.render(true);
    }

    /**
     *
     * @param {Array<object>} items
     * @param {number} chanceOfDamagedItems
     * @param {number} damagedItemsMultiplier
     * @param {number} removeDamagedItems
     *
     * @returns {Array<Items>} items Filtered lootable items
     */
    static getLootableItems(
        items,
        options = undefined
    ) {
        options = LootSheetNPC5eHelper._getOptionsDefault(options);

        return items
            /** .map((item) => {
                return item.toObject();
            })*/
            .filter((item) => {
                if (item.type == 'weapon') {
                    return item.data.weaponType != 'natural';
                }

                if (item.type == 'equipment') {
                    if (!item.data.armor) return true;
                    return item.data.armor.type != 'natural';
                }

                return !['class', 'spell', 'feat'].includes(item.type);
            })
            .filter((item) => {
                if (LootSheetNPC5eHelper._isItemDamaged(item, options.chanceOfDamagedItems)) {
                    if (options.removeDamagedItems) return false;

                    item.name += ' (Damaged)';
                    item.data.price *= options.damagedItemsMultiplier;
                }

                return true;
            })
            .map((item) => {
                item.data.equipped = false;
                return item;
            });
    }

    /**
     * Take an options object an either keep values or set the default
     *
     * @param {*} options
     * @returns {object}
     */
    static _getOptionsDefault(options) {
        return {
            chanceOfDamagedItems: options ? options?.chanceOfDamagedItems | 0 : 0,
            damagedItemsMultiplier: options ? options?.damagedItemsMultiplier | 0 : 0,
            removeDamagedItems: options ? options?.removeDamagedItems | false : false
        };
    }

    static _isItemDamaged(item, chanceOfDamagedItems) {
        const rarity = item.data.rarity;
        if (!rarity) return false;

        // Never consider items above common rarity breakable
        if (rarity.toLowerCase() !== 'common' && rarity.toLowerCase() !== 'none')
            return false;

        return Math.random() < chanceOfDamagedItems;
    }

    /* -------------------------------------------- */

    /**
     * Handle Loot item
     * @private
     */
    static lootItem(token, event, all = 0) {
        event.preventDefault();
        console.log("Loot Sheet | Loot Item clicked");
        const targetGm = PermissionHelper.getTargetGM();

        if (!targetGm) return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to purchase an item.");
        if (token === null) return ui.notifications.error(`You must loot items from a token.`);
        if ((!game.user.isGM && !game.user.actorId) || !game.user.character._id) {
            console.log("Loot Sheet | No active character for user");
            return ui.notifications.error(`No active character for user.`);
        }

        const id = event.currentTarget.dataset.itemId || event.currentTarget.closest('.item').dataset.itemId,
            targetItem = token.actor.getEmbeddedDocument("Item", id),
            looterId = (game.user.isGM) ? targetGm.id : game.user.actorId;

        const item = { id: id, quantity: 1 };
        if (all || event.shiftKey) {
            item.quantity = targetItem.data.data.quantity;
        }

        const packet = {
            type: "loot",
            triggerActorId: looterId,
            tokenId: token.id,
            items: [item],
            processorId: targetGm.id
        };

        if (targetItem.data.data.quantity === item.quantity) {
            console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
            game.socket.emit(MODULE.socket, packet);
            return;
        }

        const dialog = new QuantityDialog((quantity) => {
            packet.items[0]['quantity'] = quantity;
            console.log("LootSheet5e", "Sending loot request to " + targetGm.name, packet);
            game.socket.emit(MODULE.socket, packet);
        },
            {
                acceptLabel: "Loot"
            }
        );
        dialog.render(true);
    }

    /**
     *
     * @param {token} token
     * @param {event} event
     * @param {boolean} all
     *
     * uses PermissionHelper
     */
    static buyItem(token, event, all = false) {
        event.preventDefault();
        let targetGm = PermissionHelper.getTargetGM();

        if (!targetGm) return ui.notifications.error("No active GM on your scene, a GM must be online and on the same scene to purchase an item.");
        if (token === null) return ui.notifications.error(`You must purchase items from a token.`);
        if (!game.user.actorId) return ui.notifications.error(`No active character for user. Are you a player?`);

        const id = event.currentTarget.dataset.itemId || event.currentTarget.closest('.item').dataset.itemId,
            targetItem = token.actor.getEmbeddedDocument("Item", id);

        let item = { id: id, quantity: 1 };

        if (all || event.shiftKey) {
            item.quantity = targetItem.data.data.quantity;
        }

        const packet = {
            type: "buy",
            triggerActorId: game.user.actorId,
            tokenId: token.id,
            id: id,
            quantity: 1,
            processorId: targetGm.id
        };

        if (targetItem.data.data.quantity === item.quantity) {
            packet.quantity = item.quantity;
            console.log(MODULE.ns, "Sending buy request to " + targetGm.name, packet);
            game.socket.emit(MODULE.socket, packet);
            return;
        }


    }

    /**
     *
     * @param {Actor5e} containerActor
     * @param {Event} event
     * @returns
     */
    static sendActionToSocket(token, action, event) {
        event.preventDefault();
        if (!game.settings.get(MODULE.ns, action)) {
            return;
        }
        const
            targetGm = PermissionHelper.getTargetGM(),
            dataSet = { ...event.currentTarget.dataset, ...event.currentTarget.closest('.item')?.dataset },
            targetItemId = dataSet?.itemId,
            options = { acceptLabel: "Quantity" },
            maxQuantity = parseInt(dataSet?.maxQuantity);
        let quantity = 1;

        if (!targetGm) return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to loot coins.");
        if (token === null) return ui.notifications.error("You must `" + action + "` from a token.");
        if (!game.user.actorId) return ui.notifications.error(`No active character for user.`);

        const packet = {
            type: action,
            triggerActorId: game.user.actorId,
            tokenId: token.id,
            processorId: targetGm.id,
            targetItemId: targetItemId || null,
            quantity: quantity || null
        };

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
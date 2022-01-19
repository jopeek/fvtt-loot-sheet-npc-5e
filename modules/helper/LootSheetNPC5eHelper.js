import { PermissionHelper } from "./PermissionHelper.js";
import { MODULE } from "../data/moduleConstants.js";
import { QuantityDialog } from "../classes/quantityDialog.js";
import { ItemHelper } from "../helper/ItemHelper.js";
import { SocketListener } from "../hooks/SocketListener.js";

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
        await this.sendActionToSocket(actor.token, event);
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
    static async sendActionToSocket(token, event) {
        event.preventDefault();
        const targetGm = PermissionHelper.getTargetGM(),
            action = event.currentTarget.dataset.action,
            dataSet = { ...event.currentTarget.dataset, ...event.currentTarget.closest('.item')?.dataset },
            targetItemId = dataSet?.itemId,
            options = { acceptLabel: "Quantity" },
            maxQuantity = parseInt(dataSet?.maxQuantity),
            trades = event.currentTarget.closest('section')?.querySelectorAll('ul') || null;

        let quantity = 1,
            stagedItems = (event.currentTarget.closest('.tradegrid')) ? this._handleTradeStage(trades) : null;

        if (token === null) return ui.notifications.error("You must `" + action + "` from a token.");
        if (!game.user.character?.id && action != 'sheetUpdate') {
            return ui.notifications.info("You need to assign an actor to you user before you can do this.");
        }

        const packet = {
            action: action,
            triggerActorId: game.user.character?.id || null,
            tokenUuid: token.uuid,
            processorId: targetGm.id,
            targetItemId: targetItemId || null,
            quantity: quantity || null,
            trades: stagedItems
        };

        if (MODULE.settings.keys.sheet.sheetUpdate) {
            game.socket.emit(MODULE.socket, packet)
            //return;
        }

        if (event.shiftKey && dataSet?.getAll === 'true') {
            packet.quantity = maxQuantity;
            await this.emitToSocketOrCallMethod(packet)
        } else if (!event.shiftKey) {
            // no shiftKey, we don't ask for the quantity
            await this.emitToSocketOrCallMethod(packet)
        } else {
            // shiftKey, we ask for the quantity
            options.max = maxQuantity;
            const quantityDialog = new QuantityDialog((quantityCallback) => {
                packet.quantity = quantityCallback;
                this.emitToSocketOrCallMethod(packet);
            }, options);

            quantityDialog.render(true);
        }
       // token.actor.sheet.close();
    }

    /**
     * @module LootSheetNPC5e.Helpers.LootSheetNPC5eHelper._handleTradeStage
     * @description Handle the trade stage
     *
     * @param {event} event
     * @param {*} trades
     *
     * @returns {Array<object>} stagedItems
     */
    static _handleTradeStage(trades) {
        //&& event.currentTarget.closest('.tradegrid')
        const stagedItems = { buy: [], sell: [] };
        if (trades) {
            for (let trade of trades) {
                const type = trade.parentNode.dataset.eventTarget;
                if (trade.children.length == 0) continue;
                if (!type) continue;

                for (let tradeItem of trade.querySelectorAll('.item')) {
                    const item = {
                        id: tradeItem.dataset.id,
                        data: {
                            id: tradeItem.dataset.id,
                            data: {
                                quantity: parseInt(tradeItem.dataset.quantity),
                                price: parseInt(tradeItem.dataset.price)
                            }
                        },
                    };

                    stagedItems[type].push(item);
                }

            }
        }

        return stagedItems;
    }

    /**
     * This is so that a DM can call the socket method directly
     * Socket emitions are only ever send to others not oneself.
     * So as a GM we chave to call the method directly.
     *
     * @param {object} packet
     */
    static async emitToSocketOrCallMethod(packet) {
        if (game.user.isGM) {
            await SocketListener.handleRequest(packet);
        } else {
            game.socket.emit(MODULE.socket, packet);
        }
    }

    static sortAndGroupItems(items) {
        let groups = {
            weapons: { label: "Weapons", items: [], type: "weapon" },
            equipment: { label: "Equipment", items: [], type: "equipment" },
            consumables: { label: "Consumables", items: [], type: "consumable" },
            tools: { label: "Tools", items: [], type: "tool" },
            containers: { label: "Containers", items: [], type: "container" },
            loot: { label: "Loot", items: [], type: "loot" },
            misc: { label: "Feat", items: [], type: "feat" },
        };
        /**
         * Sort items by name
         */
        items = items.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        /**
         * categorize items
         * @type {Array}
         */

        for (let i of items) {
            i.img = i.img || 'icons/svg/item-bag.svg';

            // if object has the propery "type" push the current item to the proper group
            if (i.type && hasProperty(groups, i.type + 's')) {
                groups[i.type + 's'].items.push(i);
            } else if (["container", "backpack"].includes(i.type)) {
                groups.containers.items.push(i);
            } else if (hasProperty(groups, i.type)) {
                groups[i.type].items.push(i);
            } else {
                groups.misc.items.push(i);
            }
        }

        return groups;
    }
}
export { LootSheetNPC5eHelper };
import { PermissionHelper } from "./PermissionHelper.js";
import { MODULE } from "../data/moduleConstants.js";
import { QuantityDialog } from "../classes/quantityDialog.js";
import { ItemHelper } from "../helper/ItemHelper.js";
import { socketListener } from "../hooks/socketListener.js";

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
        const targetGm = PermissionHelper.getTargetGM(),
            action =  event.currentTarget.dataset.action,
            dataSet = { ...event.currentTarget.dataset, ...event.currentTarget.closest('.item')?.dataset },
            targetItemId = dataSet?.itemId,
            options = { acceptLabel: "Quantity" },
            maxQuantity = parseInt(dataSet?.maxQuantity),
            trades = event.currentTarget.closest('section')?.querySelectorAll('ul') || null,
            stagedItems = { buy: [], sell: [] };

        let quantity = 1;

        // prepare trade
        if (trades && event.currentTarget.closest('.tradegrid')) {
            for(let trade of trades) {
                const type = trade.parentNode.dataset.eventTarget;
                if (trade.children.length == 0) continue;
                if(!type) continue;

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

        // if (!targetGm) return ui.notifications.error("No active GM on your scene, they must be online and on the same scene to loot coins.");
        if (token === null) return ui.notifications.error("You must `" + action + "` from a token.");
        if(!game.user.character?.id && action != 'sheetUpdate'){
            return ui.notifications.info("You need to assign an actor to you user before you can do this.");
        }

        const packet = {
            action: action,
            triggerActorId: game.user.character?.id || null,
            tokenUuid: token.uuid,
            processorId: targetGm.id,
            targetItemId: targetItemId || null,
            quantity: quantity || null,
            trades: stagedItems,
        };

        if (action == MODULE.settings.keys.sheet.sheetUpdate) {
                game.socket.emit(MODULE.socket, packet)
                return;
        }

        if (event.shiftKey && dataSet?.getAll === 'true') {
            packet.quantity = maxQuantity;
            this.emitToSocketOrCallMethod(packet)
        } else if(!event.shiftKey) {
            // no shiftKey, we don't ask for the quantity
            this.emitToSocketOrCallMethod(packet)
        } else {
            // shiftKey, we ask for the quantity
            options.max = maxQuantity;
            const quantityDialog = new QuantityDialog((quantityCallback) => {
                packet.quantity = quantityCallback;
                this.emitToSocketOrCallMethod(packet);
                }, options);

            quantityDialog.render(true);
        }
    }

    /**
     * This is so that a DM can call the socket method directly
     * Socket emitions are only ever send to others not oneself.
     * So as a GM we chave to call the method directly.
     *
     * @param {object} packet
     */
    static emitToSocketOrCallMethod(packet) {
        if (game.user.isGM) {
            socketListener.handleRequest(packet);
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
            //console.log("Loot Sheet | item", i);

            // if object has the propery "type" push the current item to the proper group
            if (i.type && hasProperty(groups, i.type +'s')) {
                groups[i.type + 's'].items.push(i);
            } else if (["container", "backpack"].includes(i.type)){
                groups.containers.items.push(i);
            } else if (hasProperty(groups, i.type)){
                groups[i.type].items.push(i);
            } else {
                groups.misc.items.push(i);
            }

            continue;
            // Features
            if (i.type === "weapon") groups.weapons.items.push(i);
            else if (i.type === "equipment") groups.equipment.items.push(i);
            else if (i.type === "consumable") groups.consumables.items.push(i);
            else if (i.type === "tool") groups.tools.items.push(i);
            else if (["container", "backpack"].includes(i.type)) groups.containers.items.push(i);
            else if (i.type === "loot") groups.loot.items.push(i);
            else if (i.type === "feat") groups.feat.items.push(i);
            else groups.loot.items.push(i);
        }

        return groups;
    }
}
export { LootSheetNPC5eHelper };
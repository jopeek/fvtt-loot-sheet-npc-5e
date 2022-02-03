import { MODULE } from "../data/moduleConstants.js";

/**
 * @Module LootsheetNPC5e.Helpers.ChatHelper
 *
 * @description Helper Methods for chat cards
 *
 * @version 1.0.0
 */
export class ChatHelper {

    /**
     * @description Create a chat messaage with the given data
     *
     * @param {Token} source
     * @param {Actor5e} destination
     * @param {Item5e} movedItems
     * @param {object} options
     *
     * @returns {Array<ChatMessage>}
     *
     * @throws {Error}
     *
     * @function
     * @static
     * @inheritdoc
     */
    static async chatMessage(source, destination, movedItems, options = { chatOutPut: true, verbose: false }) {
        if (!options.chatOutPut) return;

        if (game.settings.get(MODULE.ns, MODULE.settings.keys.sheet.generateChatMessages)) {
            const interactionId = `${destination.id}-${options.type}-${source.id}`,
                existingItems = this._getItemsFromLootMessage(interactionId, options),
                parsedItems = this._parseMovedItems(movedItems, options),
                finalChatItems = this._handleExistingItems(existingItems.items, parsedItems, options);

            let messageObject = await this._renderInnerLootChatMessage(source, destination, finalChatItems, options);


            if (existingItems.id) {
                messageObject._id = existingItems.id;
                return ChatMessage.updateDocuments([messageObject]);
            } else {
                messageObject.user = game.user.id;
                messageObject.speaker = { actor: destination, alias: destination.name };
                messageObject.flags.lootsheetnpc5e.lootId = interactionId;
                return ChatMessage.create(messageObject);
            }
        }
    }

    /**
     *
     * @param {Token} source
     * @param {Actor} destination
     * @param {object} options
     *
     * @author Daniel Böttner < @DanielBoettner >
     */
    static async _renderInnerLootChatMessage(source, destination, chatItems, options = { type: 'loot', verbose: true }) {
        const messageData = {
            templatePath: MODULE.templatePath,
            colorRarity: game.settings.get(MODULE.ns, "colorRarity"),
            source: source,
            sourceId: (source.isLinked) ? source.data_id : source.id,
            destination: destination,
            flags: (source.collectionName == 'tokens') ? source.actor.data.flags : source.data.flags,
            items: chatItems,
            type: options.type,
            actionMessage: game.i18n.format('lsnpc.chatActionMessages.' + options.type, {source: source.name, destination: destination.name})
        };

        if (options.verbose) {
            console.log(`${MODULE.ns} | ${this.name} | buildChatMessage | pre render messageData: `, messageData);
        }

        return {
            content: await renderTemplate(MODULE.templatePath + '/chat/loot-chat-card.hbs', messageData),
            flags: {
                lootsheetnpc5e: {
                    loot: chatItems,
                    lootId: `${destination.id}-${options.type}-${source.id}`
                }
            }
        };
    }

    /**
     * @descriptio Parse the item info in the movedItems array
     *  And calculate the total price
     *
     * @todo make this system agnostic
     *
     * @param {Array} movedItems
     * @param {object} options
     *
     * @returns {Array}
     */
    static _parseMovedItems(movedItems, options = {}) {
        const mod = options?.priceModifier || 1;

        return movedItems.map((el) => {
            const rawprice = el.item.data.data?.price || el.item.data?.price || 0,
                price = rawprice * mod,
                totalPrice = price * el.quantity;

            return {
                quantity: el.quantity,
                priceTotal: totalPrice.toFixed(2),
                data: {
                    documentName: el.item.documentName,
                    img: el.item.img,
                    name: el.item.name,
                    id: el.item.id,
                    uuid: el.item.uuid,
                    price: price.toFixed(2),
                    rarity: el.item.data?.data?.rarity || el.item.data?.rarity || 'common'
                }
            }
        });
    }

    /**
     * If an item is already in the message, add the quantity and recalculate the stack worth
     *
     * Merge the object to upate the existing items structure
     * if we ever change the structure of the items.
     * Otherwise push the new movedItem to the existingItems array
     *
     * @param {ChatMessage} existingItems - The message object to update
     * @param {Array<object>} parsedItems - the items from from transaction
     * @param {object} options - the options object
     *
     * @returns {Array<object>}
     */
    static _handleExistingItems(existingItems, parsedItems, options = { priceModifier: 1, verbose: true }) {
        if (existingItems) {
            for (let parsedItem of parsedItems) {
                let existingItem = existingItems.find(item => item.data.id === parsedItem.data.id);
                if (!existingItem) {
                    existingItems.push(parsedItem);
                    continue;
                }
                if (existingItem.data.name === parsedItem.data.name) {
                    parsedItem.quantity += existingItem.quantity;
                    parsedItem.priceTotal = Number(parsedItem.priceTotal * parsedItem.quantity).toFixed(2);

                    existingItem = mergeObject(existingItem, parsedItem);
                }
            }
        }

        if (options.verbose) {
            console.log(`${MODULE.ns} | ChatHelper | handleExistingItems | existingItems: `, existingItems);
        }

        return existingItems;
    }

    /**
     * Check for messaged where a flag of `looterId-type-lootedId`
     * parse the html and extract the items.
     *
     * @param {string} looterId
     * @param {string} lootedId
     * @param {string} type
     *
     * @param {object} options
     *
     * @returns {object}
     * @author Daniel Böttner <@DanielBoettner>
     *
     * @since 3.4.5.3
     * @version 1.0.0
     *
     */
    static _getItemsFromLootMessage(interactionId, options = { verbose: true }) {
        let lootMessage = game.messages.filter(m => m.data.flags?.lootsheetnpc5e?.lootId == interactionId).pop(),
            existingItems = { id: 0, items: [] };

        if (!lootMessage) {
            if (options.verbose)
                console.log(`${MODULE.ns} | ChatHelper | getItemsFromLootMessage | No loot message found with interactionId: ${interactionId}`);

            return existingItems;
        }

        const stamp = lootMessage?.data.timestamp ?? 0,
            timeSince = (Date.now() - stamp),
            gracePeriod = game.settings.get(MODULE.ns, MODULE.settings.keys.sheet.chatGracePeriod),
            outOfGrace = timeSince > (gracePeriod * 1000);
        //if the existing message is older than the gracePeriod, ignore it
        if (options.verbose) {
            console.log(`${MODULE.ns} | ChatHelper | getItemsFromLootMessage |`, lootMessage, stamp);
            console.log(`${MODULE.ns} | ChatHelper | getItemsFromLootMessage | timeSince: ${timeSince} | gracePeriod: ${gracePeriod} | outOfGrace: ${outOfGrace}`);
        }
        if (outOfGrace) return existingItems;

        console.log(`${MODULE.ns} | ChatHelper | getItemsFromLootMessage | Found existing message within the grace period of interactionId: ${interactionId}`);
        existingItems = { id: lootMessage.id, items: lootMessage.getFlag(MODULE.ns, 'loot') };

        return existingItems;
    }
}
import { MODULE } from '../data/moduleConstants.js';
import { LootsheetNPC5eHooks } from '../hooks/LootsheetNPC5eHooks.js';
import { ChatHelper } from './ChatHelper.js';
import { PermissionHelper } from './PermissionHelper.js';

class ItemHelper {
    /**
    * Take an options object an either keep values or set the default
    *
    * @param {object} options
    * @returns {object}
    *
    */
    static _getOptionsDefault(options = {}) {
        return {
            breakableRarities: options?.breakableRarities || ['none', 'common'],
            chanceOfDamagedItems: options?.chanceOfDamagedItems || 0,
            damagedItemsMultiplier: options?.damagedItemsMultiplier || 0,
            removeDamagedItems: options?.removeDamagedItems || false,
            filterNaturalWeapons: game.settings.get(MODULE.ns, MODULE.settings.keys.sheet.filterNaturalWeapons) || true,
            rarityPath: options?.rarityPath || 'data.rarity'
        };
    }

    /**
     * Check if an item is damaged
     *
     * @description Checks if an item is damaged by a random number between 0 and 1
     * Will always return false if a rarity Property is found ont the item
     * and the value of that propery is not not contained in the list of valid
     * breakable rarities.
     *
     * @param {Item} item
     * @param {number} chanceOfDamagedItems between 0 and 1
     *
     * @returns {boolean}
     *
     * @version 0.2.0
     *
     */
    static isItemDamaged(item, chanceOfDamagedItems) {
        const defaultOptions = this._getOptionsDefault(),
            breakableRarities = defaultOptions.breakableRarities;
        // @todo get the rarity in a system agnostic way
        let itemRarity = getProperty(item, defaultOptions.rarityPath);

        chanceOfDamagedItems = chanceOfDamagedItems || defaultOptions.chanceOfDamagedItems;

        if (!itemRarity || chanceOfDamagedItems === 0) return false;
        itemRarity = itemRarity.toLowerCase();

        if (!breakableRarities.includes(itemRarity)) return false;

        return Math.random() < chanceOfDamagedItems;
    }

    /**
     * @description Move items from one actor to another
     *
     *
     * @param {Actor5e} source
     * @param {Actor5e} destination
     * @param {Array<Item>} items
     * @returns {Array<object>} Array with moved items
     *
     * @inheritdoc
     */
    static async moveItemsToDestination(source, destination, items) {
        const sourceUpdates = [],
            sourceDeletes = [],
            destinationAdditions = [],
            destinationUpdates = [],
            results = [];

        /**
         *  Could be optimized to do a direct call instead of {crudAction}embeddedDocuments
         *  when items is only one item.
         **/
        for (let item of items) {
            const sourceItem = source.getEmbeddedDocument("Item", item.id),
                quantity = (sourceItem.data.data.quantity < item.data.data.quantity) ? parseInt(sourceItem.data.data.quantity) : parseInt(item.data.data.quantity),
                updatedItem = { _id: sourceItem.id, data: { quantity: sourceItem.data.data.quantity - quantity } },
                targetItem = destination.getEmbeddedCollection('Item').find(i =>
                    sourceItem.name === i.name
                    && sourceItem.data.data.price === i.data.data.price
                    && sourceItem.data.data.weight === i.data.data.weight
                );

            let newItem = {};

            if (targetItem) {
                let targetUpdate = { _id: targetItem.id, data: { quantity: parseInt(targetItem.data.data.quantity + quantity) } };
                destinationUpdates.push(targetUpdate);
            } else {
                newItem = duplicate(sourceItem);
                newItem.data.quantity = parseInt(quantity);
                destinationAdditions.push(newItem);
            }

            if (updatedItem.data.quantity === 0) {
                sourceDeletes.push(sourceItem.id);
            } else {
                sourceUpdates.push(updatedItem);
            }

            results.push({
                item: targetItem || newItem,
                quantity: quantity
            });
        }

        await ItemHelper._updateActorInventory(source, { type: 'delete', data: sourceDeletes }, sourceUpdates);
        await ItemHelper._updateActorInventory(destination, { type: 'create', data: destinationAdditions }, destinationUpdates);

        return results;
    }

    /**
     * @param {Array<object>} items
     * @param {number} chanceOfDamagedItems
     * @param {number} damagedItemsMultiplier
     *
     * @returns {Array<Items>} items Filtered lootable items
     */
    static getLootableItems(
        items,
        options = {}
    ) {
        options = this._getOptionsDefault(options);

        return items
            /** .map((item) => {
                return item.toObject();
            })*/
            .filter((item) => {
                if (options?.filterNaturalWeapons) {
                    if (item.type == 'weapon') {
                        return item.data.weaponType != 'natural';
                    }
                }

                if (item.type == 'equipment') {
                    if (!item.data.armor) return true;
                    return item.data.armor.type != 'natural';
                }

                return !['class', 'spell', 'feat'].includes(item.type);
            })
            .filter((item) => {
                if (this.isItemDamaged(item, options.chanceOfDamagedItems)) {
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
     * Updates items in an actor's inventory
     *
     * @param {Actor} actor
     * @param {object} items
     * @param {Array<Item>} updatedItems
     *
     * @returns {Promise<void>}
     */
    static async _updateActorInventory(actor, items, updatedItems) {
        if (items.data.length > 0) {
            if (items.type === 'create') {
                return actor.createEmbeddedDocuments("Item", items.data);
            } else if (items.type === 'delete') {
                return actor.deleteEmbeddedDocuments("Item", items.data);
            }
        }

        if (updatedItems.length > 0)
            return actor.updateEmbeddedDocuments("Item", updatedItems);
    }

    static FormatPrice(price, system = 'dnd5e') {
        if (system == 'dnd5e') {
            let nprice = price * 100
            let cp = Math.floor(((nprice % 100) % 10));
            let sp = Math.floor((nprice % 100) / 10);
            let gp = Math.floor(price)
            return { cp: cp, sp: sp, gp: gp, ep: 0, pp: 0 }
        }
    }

    /**
     *
     * @param {Actor5e} token
     * @param {string} message
     */
    static errorMessageToActor(token, message) {
        const packet = {
            action: "error",
            triggerActorId: game.user.character?.id || null,
            tokenUuid: token.uuid,
            message: message
        };

        game.socket.emit(MODULE.socket, packet);
    }



    /**
     * Converts certain non lootable documents to lootable items
     *
     * @description This function is called when a document is converted to loot.
     * It checks itemData for the item type.
     *
     *  * Converts "spell" items to spellScrolls
     *  * checks the given or default conversions
     *  * If conversions are given for the itemType replace the given properties accordingly
     *
     * @param {Item} itemData ~ {Item}.data
     * @param {string} itemType ~ {Item}.documentName
     * @param {object} conversions
     * @returns
     */
    static async applyItemConversions(itemData, itemType, conversions = null) {
        if (itemData.type === "spell") {
            itemData = await Item5e.createScrollFromSpell(itemData);
        }

        const rarity = this.getRandomRarity(),
            randomPriceFormula = Math.floor(twist.random() * (rarity.priceRange[1] - rarity.priceRange[0] + 1)) + rarity.priceRange[0],
            priceRoller = new Roll('1d' + randomPriceFormula),
            priceRoll = await priceRoller.roll();

        /**
         *  If we have a conversion for the itemType, use it
         *  The defaults conversions should be moved somewhere
         */
        const defaultConversions = {
            Actor: {
                name: `${itemData.name} Portrait`,
                img: itemData?.img || "icons/svg/mystery-man.svg",
                type: 'loot',
                data: {
                    rarity: rarity.rarity,
                    price: priceRoll.total || 0.1
                }
            },
            Scene: {
                name: 'Map of ' + itemData.name,
                img: itemData.thumb || "icons/svg/direction.svg",
                data: {
                    rarity: rarity.rarity,
                    price: priceRoll.total || 0.1
                },
                type: 'loot'
            }
        };

        conversions = conversions || defaultConversions;

        const convert = conversions[itemType] ?? false;

        if (convert) {
            for (const prop in convert) {
                itemData[prop] = convert[prop];
            }
        }

        return itemData;
    }

    /**
     * Get a random item rarity by weight
     *
     */
    static getRandomRarity(weights = undefined) {
        const randomizerWeights = weights || [
            { rarity: '', priceRange: [0, 49], max: 30 },
            { rarity: 'common', priceRange: [50, 100], max: 60 },
            { rarity: 'uncommon', priceRange: [101, 500], max: 80 },
            { rarity: 'rare', priceRange: [501, 5000], max: 98.5 },
            { rarity: 'veryrare', priceRange: [5001, 50000], max: 99.8 },
            { rarity: 'legendary', priceRange: [50001, 1000000], max: 100 }
        ];
        //⬆️ @todo make this a settings changable thing in the future || game.settings.get(MODULE.ns, MODULE.settings.keys.rarityWeights);

        const pindex = Math.round(twist.random() * 99) + 1;

        return randomizerWeights.find(r => (pindex <= r.max));
    }
}
export { ItemHelper };

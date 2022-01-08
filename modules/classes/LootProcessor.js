import { MODULE } from '../data/moduleConstants.js';
import { utils } from '../helper/utils.js';
import { currencyHelper } from '../helper/currencyHelper.js';
import { ItemHelper } from '../helper/ItemHelper.js';

/**
 * Create a new LootProcessor object.
 *
 * Requires an {Actor} object and a Loot object.
 *
 */
export class LootProcessor {

    /**
     *
     * @param {Actor} actor
     * @param {Array} results
     * @param {object} options
     *
     */
    constructor(results, actor, options = {}) {
        /**
         * @type {Actor}
         */
        this.actor = actor || this._getLootActor(actor);
        this.results = results;
        this.lootResults = [];
        this.currencyData = actor.data.data?.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
        this.defaultConversions = {};
        this.options = options || {
            currencyString: '',
            stackSame: true,
            tokenUuid: null,
        };

        return this;
    }

    async buildResults(options = {}) {
        const currencyString = options?.currencyString ?? '0';
        this.currencyData = await currencyHelper.generateCurrency(currencyString);

        for (let i = 0; i < this.results.length; i++) {
            const betterResults = await this._parseResult(this.results[i], options);
            // if a inner table is rolled, the result returned is undefined but the array this.lootResults is extended with the new results

            for (const r of betterResults) {
                this.lootResults.push(r);
            }
        }
        return this.lootResults;
    }

    /**
       *
       * @param {object} item
       * @param {object} conversions
       *
       * @returns
       */
    async buildItemData(item, conversions = null) {
        let itemData = {},
            existingItem = false;

        /** Try first to load item from compendium */
        if (item.collection) {
            existingItem = await utils.getItemFromCompendium(item);
        } else {
            /** if an item with this name exist we load that item data, otherwise we create a new one */
            existingItem = game.items.getName(item.text);
        }

        if (existingItem) {
            itemData = duplicate(existingItem.data);
        }

        if (Object.getOwnPropertyDescriptor(item, 'commands') && item.commands) {
            itemData = this._applyCommandToItemData(itemData, item.commands);
        }

        if (!itemData) return;

        itemData = await this.preItemCreationDataManipulation(itemData, existingItem);
        return itemData;
    }

    /**
     *
     * @param {boolean} ret
     * @returns {Array}
     *
     */
    async _getLootActor(ret = false) {
        if (!this.actor) {
            this.actor = await Actor.create({
                name: actorName || 'New Loot',
                type: 'npc',
                img: 'modules/better-rolltables/artwork/chest.webp',
                sort: 12000,
                token: { actorLink: true }
            });

            if (ret)
                return this.actor;
        }
    }

    /**
     * Add given currency to existing currency
     *
     * @param {array} currencyData
     */
    _addCurrency(currencyData) {
        for (const key in currencyData) {
            this.currencyData[key] = (this.currencyData[key] || 0) + currencyData[key]
        }
    }

    /**
         * Get a table result and parse it
         *
         * @notes Taken from Better Rolltables Module
         *
         * @param {*} result
         * @returns
         */
    async _parseResult(result, options) {
        const betterResults = []
        if (result.data.type === CONST.TABLE_RESULT_TYPES.TEXT) {
            const textResults = result.data.text.split('|');

            for (let t of textResults) {
                // if the text is a currency, we process that first
                t = await this._processTextAsCurrency(t);
                t = await this._rollInlineDice(t);

                // eslint-disable-next-line no-useless-escape
                const regex = /(\s*[^\[@]*)@*(\w+)*\[([\w.,*+-\/\(\)]+)\]/g;
                let textString = t;
                const commands = [];
                let table;
                const betterResult = {};
                let matches;

                while ((matches = regex.exec(t)) !== null) {
                    // matches[1] is undefined in case we are matching [tablename]
                    // if we are matching @command[string] then matches[2] is the command and [3] is the arg inside []
                    // console.log(`match 0: ${matches[0]}, 1: ${matches[1]}, 2: ${matches[2]}, 3: ${matches[3]}`);

                    if (matches[1] !== undefined && matches[1].trim() !== '') {
                        textString = matches[1];
                    }
                    // textString = matches[1] || textString; //the first match is the text outside [], a rollformula
                    const commandName = matches[2];
                    const innerTableName = matches[3];

                    if (!commandName && innerTableName) {
                        const out = utils.separateIdCompendiumName(innerTableName);
                        const tableName = out.nameOrId;
                        const tableCompendiumName = out.compendiumName;

                        if (tableCompendiumName) {
                            table = await utils.findInCompendiumByName(tableCompendiumName, tableName);
                        } else {
                            table = game.tables.getName(tableName);
                        }

                        if (!table) {
                            msg = `not table with name ${tableName} found in pack ${tableCompendiumName}`;//game.i18n.format(NotTableByNameInPack, { tableName: tableName, packName: tableCompendiumName });
                            ui.notifications.warn(MODULE.ns + ' | ' + msg);
                        }
                        break
                    } else if (commandName) {
                        commands.push({ command: commandName.toLowerCase(), arg: matches[3] });
                        if (commandName.toLowerCase() === 'compendium') {
                            betterResult.collection = matches[3];
                        }
                    }
                }

                // if a table definition is found, the textString is the rollFormula to be rolled on that table
                if (table) {
                    const numberRolls = await this.tryRoll(textString);
                    const innerTableRoller = new TableRoller(table);
                    const innerTableResults = await innerTableRoller.roll(numberRolls);

                    debugger;
                    // take care of nested tables
                    this.tableResults = this.tableResults.concat(innerTableResults);
                } else if (textString) {
                    // if no table definition is found, the textString is the item name
                    console.log(`results text ${textString.trim()} and commands ${commands}`);
                    betterResult.img = result.data.img;
                    betterResult.text = textString.trim();
                    // if there is command, then it's not a pure text but a generated item
                    if (!commands || commands.length === 0) {
                        betterResult.type = CONST.TABLE_RESULT_TYPES.TEXT;
                    }
                    betterResult.commands = commands;
                    betterResults.push(betterResult);
                }
            }
        } else {
            const betterResult = {};
            betterResult.img = result.data.img;
            betterResult.collection = result.data.collection;
            betterResult.text = result.data.text;
            betterResults.push(betterResult);
        }

        return betterResults;
    }

    /**
     * obsolete?
     *
     * @param {Actor} actor
     * @param {object} options
     * @returns
     */
    async addCurrenciesToActor(actor = this.actor, options = {}) {
        if (!actor) return;
        const currencyData = duplicate(this.actor.data.data.currency);
        const lootCurrency = this.currencyData;

        let currenciesToAdd = currencyHelper.addCurrenciesToToken(currencyData, lootCurrency);

        if (!actor) return;
        debugger;
        await actor.update({ 'data.currency': currenciesToAdd });
    }

    /**
     * Obsolete?
     *
     * @param {boolean} stackSame Should same items be stacked together? Default = true
     *
     * @returns
     */
    async addItemsToActor(options = { stackSame: true }) {
        debugger;
        // we do use this?

        const items = [];
        for (const item of this.lootResults) {
            const newItem = await this._createLootItem(item, this.actor, options.stackSame);
            items.push(newItem);
        }
        return items;
    }

    /**
       *
       * @param {object} item representation
       * @param {Actor} actor to which to add items to
       * @param {boolean} stackSame if true add quantity to an existing item of same name in the current actor
       * @param {number} customLimit
       *
       * @returns {Item} the create Item (foundry item)
       */
    async _createLootItem(item, actor, options) {
        const newItem = { data: await this.buildItemData(item) },
            itemPrice = newItem.data?.data?.price || 0,
            embeddedItems = [...actor.getEmbeddedCollection('Item').values()],
            originalItem = embeddedItems.find(i => i.name === newItem.data?.name && itemPrice === getProperty(i.data, 'data.price'));

        let itemQuantity = new Roll(options?.itemQtyFormula, actor.data).roll().total || newItem?.data?.data.quantity || 1,
            itemLimit = new Roll(options?.itemQtyLimitFormula, actor.data).roll().total || 0;
        originalItemQuantity = originalItem?.data?.quantity || 1,
            limitCheckedQuantity = this._handleLimitedQuantity(itemQuantity, originalItemQuantity, itemLimit);

        /** if the item is already owned by the actor (same name and same PRICE) */
        if (originalItem && stackSame) {
            /** add quantity to existing item */
            let updateItem = {
                _id: originalItem.id,
                data: {
                    quantity: limitCheckedQuantity
                }
            };

            if (limitCheckedQuantity != itemQuantity) {
                await actor.updateEmbeddedDocuments('Item', [updateItem]);
            }

            return actor.items.get(originalItem.id);
        }

        /** we create a new item if we don't own already */
        await actor.createEmbeddedDocuments('Item', [newItem.data]);
        /** Get the new item and return it */
        return actor.items.get(newItem.data._id);
    }

    /**
     *
     * @param {number} currentQty Quantity of item we want to add
     * @param {number} originalQty Quantity of the originalItem already in posession
     * @param {number} customLimit A custom Limit
     * @returns
     */
    _handleLimitedQuantity(currentQty, originalQty, customLimit = 0) {
        const newQty = Number(originalQty) + Number(currentQty);

        if (customLimit > 0) {
            // limit is bigger or equal to newQty
            if (Number(customLimit) >= Number(newQty)) {
                return newQty;
            }
            //limit was reached, we stick to that limit
            return customLimit;
        }

        //we don't care for the limit
        return newQty;
    }


    /**
      *
      * @param {String} tableText
      * @returns
      */
    async _processTextAsCurrency(tableText) {
        const regex = /{([^}]+)}/g
        let matches

        while ((matches = regex.exec(tableText)) != null) {
            this._addCurrency(await this._generateCurrency(matches[1]))
        }

        return tableText.replace(regex, '')
    }

    /**
     *
     * @param {string} tableText
     * @returns
     */
    async _rollInlineDice(tableText) {
        const regex = /\[{2}(\w*[^\]])\]{2}/g
        let matches
        while ((matches = regex.exec(tableText)) != null) {
            tableText = tableText.replace(matches[0], await this.tryRoll(matches[1]))
        }

        return tableText
    }

    /**
       *
       * @param {object} itemData
       * @param {object[]} commands
       * @returns {object} itemData
       */
    _applyCommandToItemData(itemData, commands) {
        for (const cmd of commands) {
            // TODO check the type of command, that is a command to be rolled and a valid command
            let rolledValue;
            try {
                rolledValue = new Roll(cmd.arg).roll().total;
            } catch (error) {
                continue;
            }
            setProperty(itemData, `data.${cmd.command.toLowerCase()}`, rolledValue);
        }
        return itemData;
    }

    /**
       *
       * @param {string} rollFormula
       * @returns
       */
	async tryRoll(rollFormula) {
        try {
            return (await (new Roll(rollFormula)).roll({ async: true })).total || 1;
        } catch (error) {
            console.error(MODULE.ns + ' | currencyHelper :', error);
            return 1;
        }
    }

    /**
       *
       * @param {Token|Actor} token
       * @param {Boolean} is the token passed as the token actor instead?
       */
    async addCurrenciesToToken(token, isTokenActor = false) {
        // needed for base key set in the event that a token has no currency properties
        const currencyDataInitial = { cp: 0, ep: 0, gp: 0, pp: 0, sp: 0 };
        let currencyData = currencyDataInitial;

        if (isTokenActor) {
            currencyData = duplicate(token.data.data.currency);
        } else if (token.data.actorData?.data?.currency) {
            currencyData = duplicate(token.data.actorData.data.currency);
        }

        const lootCurrency = this.currencyData;

        for (const key in currencyDataInitial) {
            const amount = Number(currencyData[key] || 0) + Number(lootCurrency[key] || 0);
            currencyData[key] = amount;
        }

        if (isTokenActor) {
            // @type {Actor}
            return await token.update({ 'actorData.data.currency': currencyData });
        } else {
            return await token.actor.update({ 'data.currency': currencyData });
        }
    }

    /**
     *
     * @param {token} token
     * @param {boolean} stackSame
     * @param {boolean} isTokenActor
     * @param {number} customLimit
     * @returns
     */
    async addItemsToToken(token, stackSame = true, isTokenActor = false, customLimit = 0) {
        let items = [];
        for (const item of this.lootResults) {
            // Create the item making sure to pass the token actor and not the base actor
            const newItem = await this._createLootItem(item, token.actor, stackSame, customLimit);
            items.push(newItem);
        }

        return items;
    }

    /**
     *
     * @param {object} itemData
     * @param {Item} originalItem
     * @returns
     */
    async preItemCreationDataManipulation(itemData, originalItem) {
        itemData = await this.createScrollFromSpell(itemData);

        if (originalItem.documentName) {
            itemData = await ItemHelper.applyItemConversions(itemData, originalItem.documentName);
        }

        return itemData;
    }

    /**
     *
     * @param {number} level
     *
     * @returns {Item}
     */
    async _getRandomSpell(level) {
        const spells = this.getSpellCache().filter(spell => getProperty(spell, 'data.level') === level),
            spell = spells[Math.floor(Math.random() * spells.length)]
        return utils.findInCompendiumById(spell.collection, spell._id)
    }

    /**
   * Update spell cache used for random spell scroll generation
   *
   * @returns {Promise<void>}
   */
    async updateSpellCache(pack) {
        if (game.user.isGM) {
            const defaultPack = game.settings.get(MODULE.ns, 'dnd5e.spells'),
                spellCompendium = game.packs.get(defaultPack);

            if (!pack && spellCompendium || pack === defaultPack) {
                const spellCompendiumIndex = await spellCompendium.getIndex({ fields: ['data.level', 'img'] })
                this._spellCache = spellCompendiumIndex.filter(entry => entry.type === "spell").map(i => mergeObject(i, { collection: spellCompendium.collection }))
            } else {
                ui.notifications.error(MODULE.ns + `| Spell cache could not be initialized/updated.`);
            }
        }
    }

    /**
       * Get spells in cache for
       * @returns {*}
       */
    getSpellCache() {
        return this._spellCache;
    }

    /**
     *
     * @param {object} itemData ~ {Item}.data
     * @throws {Warning}
     *
     * @returns {object} itemData ~ {Item}.data
     */
    async createScrollFromSpell(itemData) {

        const match = /\s*Spell\s*Scroll\s*(\d+|cantrip)/gi.exec(itemData.name);

        itemData = duplicate(itemData);

        if (!match) {
            return itemData
        }

        // If it is a scroll then open the compendium
        const level = match[1].toLowerCase() === 'cantrip' ? 0 : parseInt(match[1])
        const item = await this._getRandomSpell(level)

        if (!item) {
            ui.notifications.warn(MODULE.ns + ` | No spell of level ${level} found in compendium  ${item.collection} `)
            return itemData
        }

        const itemLink = `@Compendium[${item.pack}.${item.data._id}]`
        // make the name shorter by removing some text
        itemData.name = itemData.name.replace(/^(Spell\s)/, '')
        itemData.name = itemData.name.replace(/(Cantrip\sLevel)/, 'Cantrip')
        itemData.name += ` (${item.data.name})`
        itemData.data.description.value = '<blockquote>' + itemLink + '<br />' + item.data.data.description.value + '<hr />' + itemData.data.description.value + '</blockquote>'
    }
}
import { MODULE } from "../data/moduleConstants.js";
import { tokenHelper } from "../helper/tokenHelper.js";

export class sheetListener {

    /**
     * Put eventListeners on the given items
     *
     * @note See templates/trade/index.hbs for trade tab structure
     * This should be called on the trade tab.
     * It expects the following structure:
     * <main data-event-action="trade" >
     *  [...]
     *  <ul>
     *      <li class="item" [data attributes] ></li>
     *  </ul
     *
     * @param {Array} tradeableItems
     */
    static tradeItemEventListeners(tradeableItems) {
        for (let item of tradeableItems) {
            item.addEventListener('dragstart', (ev) => {
                const item = ev.currentTarget.dataset;
                let data = {
                    uuid: item.uuid,
                    eventAction: ev.currentTarget.closest('section').dataset.eventAction,
                    source: ev.currentTarget.closest('section')
                };
                ev.currentTarget.setData('text/plain', JSON.stringify(data));
                //ev.target.style.opacity = .5;
            });

            item.addEventListener('click', ev => this._onClick(ev));
            item.addEventListener('contextmenu', ev => this._onClick(ev));
        }
    }

    /**
     *
     * @param {Event} event
     */
    static _onClick(event) {
        if(!event.currentTarget.dataset) return;
        event.preventDefault();
        event.stopPropagation();

        const item = event.currentTarget.dataset;
        let data = {
            uuid: item.uuid,
            eventAction: event.currentTarget.closest('main').dataset.eventAction,
            source: event.currentTarget.closest('section'),
            stack: event.type == 'click' ? false : true
        };
        this._tradeItemStagingHandler(data, event);
    }

    /**
     * @description
     * Accept the drop of an item.
     * Check the items source and place it in the correct container.
     *
     * @param {Event} event
     */
    static onDrop(event) {
        event.preventDefault();
        let data = JSON.parse(event.dataTransfer.getData("text/plain"));
        if (!data) return;
        this._tradeItemStagingHandler(data, event);
        // done goodbye 👋
    }

    static async makeTrade(event) {
        const tradeSection = document.closest('section')
              sellItems = tradeSection.querySelectorAll('main[]');

    }

    /**
     * Update the sheets inventory
     *
     * @param {Event} event
     * @param {Actor} actor
     * @param {Token} token
     *
     * @returns
     */
    static async inventoryUpdateListener(event, actor, token) {
        event.preventDefault();

        const rolltableUUID = actor.getFlag(MODULE.ns, "rolltable"),
            shopQtyFormula = actor.getFlag(MODULE.ns, MODULE.flags.shopQty) || "1",
            itemQtyLimitFormula = actor.getFlag(MODULE.ns, MODULE.flags.itemQtyLimit) || "0",
            clearInventory = actor.getFlag(MODULE.ns, MODULE.flags.clearInventory),
            betterRolltablesModule = {
                ns: 'better-rolltables',
                use: game.settings.get(MODULE.ns, MODULE.settings.keys.common.useBetterRolltables) || false
            };

        let rolltable = await fromUuid(rolltableUUID);
        if (!rolltable) return ui.notifications.error(`No Rollable Table found with uuid "${rolltableUUID}".`);

        if (clearInventory) {
            let currentItems = actor.data.items.map(i => i.id);
            await actor.deleteEmbeddedDocuments("Item", currentItems);
        }

        // populate via better-rolltables if it is installed and its activated in config
        if (
            betterRolltablesModule.use &&
            rolltable.getFlag(betterRolltablesModule.ns, 'table-type')
        ) {
            const betterRolltablesAPI = game.modules.get(betterRolltablesModule.ns).public.API;
            let customRoll = new Roll(shopQtyFormula),
                itemLimitRoll = new Roll(itemQtyLimitFormula),
                options = {};

            customRoll.roll();
            itemLimitRoll.roll();

            options.customRole = customRoll.total;
            options.itemQtyLimit = itemLimitRoll.total;

            await betterRolltablesAPI.addLootToSelectedToken(
                rolltable,
                actor.data.token,
                options
            );

            return actor.sheet.render(true); //population should done, good bye 👋
        } else {
            // use built-in population method
            await tokenHelper.populateWithRolltable(rolltable, token);
        }
        await actor.sheet.close();
        return actor.sheet.render(true);
    }

    /**
     * Handle merchant settings change
     * @private
     */
    static async inventorySettingChange(event, actor) {
        event.preventDefault();

        // @todo get this from the settings, leverage the constants, if key exists in MODULE.
        const expectedKeys = ["rolltable", "shopQty", "itemQty", "itemQtyLimit", "clearInventory", "itemOnlyOnce", "currencyFormula"];
        let targetKey = event.target.name.split('.')[3];

        if (!expectedKeys.includes(targetKey)) {
            console.log(MODULE.ns + ` | Error changing stettings for "${targetKey}".`);
            return ui.notifications.error(`Error changing stettings for "${targetKey}".`);
        }

        if (targetKey == "clearInventory" || targetKey == "itemOnlyOnce") {
            console.log(MODULE.ns + " | " + targetKey + " set to " + event.target.checked);
            await actor.setFlag(MODULE.ns, targetKey, event.target.checked);
            return;
        }

        console.log(MODULE.ns + " | " + targetKey + " set to " + event.target.value);
        await actor.setFlag(MODULE.ns, targetKey, event.target.value);
    }

    /**
     *
     * @param {object} data
     * @param {Event} event
     * @returns
     */
    static _tradeItemStagingHandler(data, event) {
        const sourceSelector = 'main[data-event-action="' + data.eventAction + '"] ul',
            targetSelector = 'main[data-event-target="' + data.eventAction + '"] ul',
            sourceList = document.querySelector(sourceSelector),
            targetList = document.querySelector(targetSelector),
            item = sourceList.querySelector('.item[data-uuid="' + data.uuid + '"]'),
            existingItem = targetList.querySelector('.item[data-uuid="' + data.uuid + '"]');

        if (!item) return;

        if (!existingItem && item.dataset.quantity == 1) {
            targetList.appendChild(item);
            return;
        }

        let quantity = parseInt(item.dataset.quantity);
        const newItem = item.cloneNode();
        // handle quantity update
        quantity--;

        if (quantity == 0){
            item.remove();
        } else {
            item.dataset.quantity = quantity;
        }

        newItem.dataset.quantity = 1;
        newItem.addEventListener('click', ev => this._onClick(ev));

        //check if newItem already exists in the targetList

        if (existingItem) {
            existingItem.dataset.quantity = parseInt(existingItem.dataset.quantity) + 1;
        } else {
            targetList.appendChild(newItem);
        }

        // done goodbye 👋
    }
}
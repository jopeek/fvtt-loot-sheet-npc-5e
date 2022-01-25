import { MODULE } from "../data/moduleConstants.js";
import { LootSheetNPC5eHelper } from "../helper/LootSheetNPC5eHelper.js";
import { PermissionHelper } from "../helper/PermissionHelper.js";
import { sheetHelper } from "../helper/sheetHelper.js";
import { tokenHelper } from "../helper/tokenHelper.js";

export class SheetListener {
    /**
     *
     * @param {number} id current app id of the sheet
     * @param {Token} token current token of the sheet
     * @param {Actor} actor current actor of the sheet
     * @param {object} options options for the sheet
     */
    constructor(id, token, actor, options) {
        this.id = id;
        this.token = token;
        this.actor = actor;
        this.options = options;
    }

    /**
     *
     * @description activate the sheets main listeners for interface interaction
     *
     */
    async activateListeners(options = {}) {
        const app = document.querySelector(`#${this.id}`);
        if (!app) return;
        const sheetActionButtons = app.querySelectorAll('.lsnpc-action-link'),
            tradeableItems = app.querySelectorAll('.tradegrid .item'),
            helpTexts = app.querySelectorAll('.help');

        if (this.options.editable) {
            /**
             * GM or owner only
             */
            const bulkPermissions = app.querySelectorAll('.permission-option a'),
                individualPermissions = app.querySelectorAll('.permission-proficiency'),
                permissionsFilter = app.querySelector('.permissions-filter'),
                priceModifierDialog = app.querySelector('.price-modifier'),
                sheetStyle = app.querySelector('.gm-settings .sheet-style'),
                inventorySettings = app.querySelector('.gm-settings .inventory-settings'),
                inventoryUpdate = app.querySelector('.gm-settings .update-inventory');

                for (let button of bulkPermissions) {
                    button.addEventListener('click', ev => PermissionHelper.bulkPermissionsUpdate(ev, this.actor));
                }

                for (let playerPermissionButton of individualPermissions) {
                    playerPermissionButton.addEventListener('click', ev => PermissionHelper.cyclePermissions(ev,this.actor));
                }

                if (priceModifierDialog) {
                    priceModifierDialog.addEventListener('click', ev => sheetHelper.renderPriceModifierDialog(ev, this.actor));
                }

                permissionsFilter.addEventListener('change', ev => this.actor.setFlag(MODULE.ns, 'permissionsFilter', ev.target.value));
                inventorySettings.addEventListener('change', ev => this.inventorySettingChange(ev, this.actor));
                sheetStyle.addEventListener('change', (ev) => this.sheetStyleChange(ev, this.actor));
                inventoryUpdate.addEventListener('click', ev => this.inventoryUpdateListener(ev));
                // toggle infoboxes
        }

        /**
         * Listeners for all the
         */
        this.tradeItemEventListeners(tradeableItems);

        for (let actionButton of sheetActionButtons) {
            const eventType = actionButton.nodeName === 'SELECT' ? 'change' : 'click';
            actionButton.toggleAttribute('disabled', false);
            actionButton.addEventListener(eventType, ev => LootSheetNPC5eHelper.sendActionToSocket(this.actor, ev));
        }

        for (let helpText of helpTexts) {
            helpText.addEventListener('hover', ev => SheetListener.toggleHelp(ev));
        }

        if (options && options?.verbose) console.log(`${MODULE.ns} | Sheet | Listeners activated`);
    }

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
    tradeItemEventListeners(tradeableItems) {
        for (let item of tradeableItems) {
             item.addEventListener('click', ev => this._onClick(ev));
            item.addEventListener('contextmenu', ev => this._onClick(ev));
        }
    }

    /**
     *
     * @param {Event} event
     */
    _onClick(event) {
        if (!event.currentTarget.dataset) return;
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
    }

    /**
     * Update the sheets inventory
     *
     * @param {Event} event
     * @param {Actor} this.actor
     * @param {Token} this.token
     *
     * @returns
     */
    async inventoryUpdateListener(event) {
        event.preventDefault();

        const rolltableUUID = this.actor.getFlag(MODULE.ns, "rolltable"),
            shopQtyFormula = this.actor.getFlag(MODULE.ns, MODULE.flags.shopQty) || "1",
            itemQtyLimitFormula = this.actor.getFlag(MODULE.ns, MODULE.flags.itemQtyLimit) || "0",
            clearInventory = this.actor.getFlag(MODULE.ns, MODULE.flags.clearInventory),
            betterRolltablesModule = {
                ns: 'better-rolltables',
                use: game.settings.get(MODULE.ns, MODULE.settings.keys.common.useBetterRolltables) || false
            };

        if (!rolltableUUID) return ui.notifications.info(`No rolltable set for ${this.actor.name}.`);

        let rolltable = await fromUuid(rolltableUUID);
        if (!rolltable) return ui.notifications.error(`No Rollable Table found with uuid "${rolltableUUID}".`);

        if (clearInventory) {
            let currentItems = this.actor.data.items.map(i => i.id);
            await this.actor.deleteEmbeddedDocuments("Item", currentItems);
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

            if(betterRolltablesAPI) {
                await betterRolltablesAPI.addLootToSelectedToken(
                    rolltable,
                    this.actor.data.token,
                    options
                );

                return this.actor.sheet.render(true); //population should done, good bye 👋
            }
        }

        await tokenHelper.populateWithRolltable(rolltable, {actor: this.actor});
        await this.actor.sheet.close();
        return await this.actor.sheet.render(true);
    }

    /**
     * Handle merchant settings change
     * @private
     */
    async inventorySettingChange(event, actor) {
        event.preventDefault();

        // @todo get this from the settings, leverage the constants, if key exists in MODULE.
        const expectedKeys = [
            "lootsheettype",
            "rolltable",
            "shopQty",
            "itemQty",
            "itemQtyLimit",
            "clearInventory",
            "itemOnlyOnce",
            "currencyFormula"
        ];

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
     * Handle style changes manually
     *
     * @param {Event} event
     * @param {Actor} actor
     *
     * @private
     */
    async sheetStyleChange(event, actor) {
        event.preventDefault();

        // @todo get this from the settings, leverage the constants, if key exists in MODULE.
        const expectedKeys = ["sheettint", "avatartint", "customBackground", "darkMode"];

        let splittedName = event.target.name.split('.'),
            targetKey = splittedName[2],
            targetExtra = splittedName[3];

        if (!expectedKeys.includes(targetKey)) return;

        if(!targetExtra) {
            const value = event.target.checked === undefined ? event.target.value : event.target.checked;
            console.log(MODULE.ns + " | " + targetKey + " set to " + value);
            actor.setFlag(MODULE.ns, targetKey, value);
        } else {
            console.log(MODULE.ns + " | " + targetKey + '.' + targetExtra + " set to " + event.target.value);
            actor.setFlag(MODULE.ns, targetKey + '.' + targetExtra, event.target.value);
        }

        tokenHelper.handleRerender(actor.uuid);
    }

    /**
     *
     * @param {object} data
     * @param {Event} event
     * @returns
     */
    _tradeItemStagingHandler(data, event) {
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

        if (quantity == 0) {
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
import { MODULE } from '../../data/config.js';
import { LootSheetNPC5eSettingsConfig } from '../../apps/config/lootsheet.js';

/**
 * @module lootsheetnpc5e.ModuleSettings
 */
export class SheetSettings {
    /**
     * @module lootsheetnpc5e.ModuleSettings.registerSettings
     *
     * @description Register ModuleSettings with core Foundry
     * @static
     */
    static registerSettings() {

        game.settings.registerMenu(MODULE.ns, MODULE.settings.keys.sheet.advancedOptions, {
            name: game.i18n.format("Advanced Options"),
            label: game.i18n.format("Advanced Options & Defaults"),
            icon: "fas fa-user-cog",
            type: LootSheetNPC5eSettingsConfig,
            restricted: true
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.common.useBetterRolltables, {
            name: "Use better rolltables",
            hint: "If installed make use of better rolltables to update Inventory?",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.filterNaturalWeapons, {
            name: "Filter Natural Weapons",
            hint: "Should natural weapons be filtered from the loot sheets 'lootable' inventory?",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.colorRarity, {
            name: "Colorize rarity?",
            hint: "Use slight color indication to show rarity? (Be aware that this might affect colorblind players)",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.ui,
            config: true,
            default: true,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.lootItem, {
            name: "Loot Item?",
            hint: "If enabled, players will have the option to loot items from an NPC.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.lootAll, {
            name: "Loot all?",
            hint: "If enabled, players will have the option to loot all items to their character, currency will follow the 'Loot Currency?' setting upon Loot All.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.convertCurrency, {
            name: "Convert currency after purchases?",
            hint: "If enabled, all currency will be converted to the highest denomination possible after a purchase. If disabled, currency will subtracted simply.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.lootCurrency, {
            name: "Loot currency?",
            hint: "If enabled, players will have the option to loot all currency to their character, in addition to splitting the currency between players.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.includeCurrencyWeight, {
            name: "Include Currency Weight",
            hint: "Include the weight of the currency in the Total Weight calculation.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
            config: false,
            default: false,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.generateChatMessages , {
            name: "Display chat message for purchases?",
            hint: "If enabled, a chat message will display purchases of items from the loot sheet.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.buyItem, {
            name: "Buy Item?",
            hint: "If enabled, players will have the option to buy items from an NPC.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.merchant,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.stackBuyConfirm, {
            name: "Confirm stack purchase?",
            hint: "If enabled, confirmation is requested when buying an item stack.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.merchant,
            config: false,
            default: true,
            type: Boolean
        });


        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.showStackWeight, {
            name: "Show Stack Weight?",
            hint: "If enabled, shows the weight of the entire stack next to the item weight",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.reduceUpdateVerbosity, {
            name: "Reduce Update Shop Verbosity",
            hint: "If enabled, no notifications will be created every time an item is added to the shop.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.maxPriceIncrease, {
            name: "Maximum Price Increase",
            hint: "Change the maximum price increase for a merchant in percent",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.merchant,
            config: false,
            default: 200,
            type: Number
        });

        /**
         * UI and Themes
         */
         game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.autoCheckUpdates, {
            name: "Check for updates",
            hint: "Check for available module updates on startup.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.ui,
            config: true,
            default: true,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.useCondensedLootsheet, {
            name: "⚠️ ALPHA ⚠️ Use a condensed lootsheet",
            hint: "Show a more condensed lootsheet to the players?",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.ui,
            config: true,
            default: false,
            type: Boolean,
        });
    }
}
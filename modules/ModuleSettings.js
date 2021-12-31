import { MODULE } from './config.js';
import { LootSheetNPC5eSettingsConfig } from './classes/settingsConfig.js';

/**
 * @module lootsheetnpc5e.ModuleSettings
 */
class ModuleSettings {

    /**
     * @module lootsheetnpc5e.ModuleSettings.registerSettings
     *
     * @description Register ModuleSettings with core Foundry
     * @static
     */
    static registerSettings() {
        const WORLD = 'world',
            GROUP_DEFAULT = 'defaults',
            GROUP_UI = 'UI',
            GROUP_LOOT = 'Loot',
            GROUP_MERCHANT = 'Merchant';

        game.settings.registerMenu(MODULE.ns, "advancedOptions", {
            name: game.i18n.format("Advanced Options"),
            label: game.i18n.format("Advanced Options & Defaults"),
            icon: "fas fa-user-cog",
            type: LootSheetNPC5eSettingsConfig,
            restricted: true
        });

        game.settings.register(MODULE.ns, "useBetterRolltables", {
            name: "Use better rolltables",
            hint: "If installed make use of better rolltables to update Inventory?",
            scope: WORLD,
            group: GROUP_DEFAULT,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "lootItem", {
            name: "Loot Item?",
            hint: "If enabled, players will have the option to loot items from an NPC.",
            scope: WORLD,
            group: GROUP_LOOT,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "lootAll", {
            name: "Loot all?",
            hint: "If enabled, players will have the option to loot all items to their character, currency will follow the 'Loot Currency?' setting upon Loot All.",
            scope: WORLD,
            group: GROUP_LOOT,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "convertCurrency", {
            name: "Convert currency after purchases?",
            hint: "If enabled, all currency will be converted to the highest denomination possible after a purchase. If disabled, currency will subtracted simply.",
            scope: WORLD,
            group: GROUP_DEFAULT,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "lootCurrency", {
            name: "Loot currency?",
            hint: "If enabled, players will have the option to loot all currency to their character, in addition to splitting the currency between players.",
            scope: WORLD,
            group: GROUP_LOOT,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "includeCurrencyWeight", {
            name: "Include Currency Weight",
            hint: "Include the weight of the currency in the Total Weight calculation.",
            scope: WORLD,
            group: GROUP_DEFAULT,
            config: false,
            default: false,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, "buyChat", {
            name: "Display chat message for purchases?",
            hint: "If enabled, a chat message will display purchases of items from the loot sheet.",
            scope: WORLD,
            group: GROUP_DEFAULT,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "buyItem", {
            name: "Buy Item?",
            hint: "If enabled, players will have the option to buy items from an NPC.",
            scope: WORLD,
            group: GROUP_MERCHANT,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "stackBuyConfirm", {
            name: "Confirm stack purchase?",
            hint: "If enabled, confirmation is requested when buying an item stack.",
            scope: WORLD,
            group: GROUP_MERCHANT,
            config: false,
            default: true,
            type: Boolean
        });


        game.settings.register(MODULE.ns, "showStackWeight", {
            name: "Show Stack Weight?",
            hint: "If enabled, shows the weight of the entire stack next to the item weight",
            scope: WORLD,
            group: GROUP_DEFAULT,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "reduceUpdateVerbosity", {
            name: "Reduce Update Shop Verbosity",
            hint: "If enabled, no notifications will be created every time an item is added to the shop.",
            scope: WORLD,
            group: GROUP_DEFAULT,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, "maxPriceIncrease", {
            name: "Maximum Price Increase",
            hint: "Change the maximum price increase for a merchant in percent",
            scope: WORLD,
            group: GROUP_MERCHANT,
            config: false,
            default: 200,
            type: Number
        });

        /**
         * UI and Themes
         */
        game.settings.register(MODULE.ns, "useCondensedLootsheet", {
            name: "⚠️ ALPHA ⚠️ Use a condensed lootsheet",
            hint: "Show a more condensed lootsheet to the players?",
            scope: WORLD,
            group: GROUP_UI,
            config: true,
            default: false,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, "colorRarity", {
            name: "Colorize rarity?",
            hint: "Use slight color indication to show rarity? (Be aware that this might affect colorblind players)",
            scope: WORLD,
            group: GROUP_UI,
            config: true,
            default: true,
            type: Boolean,
        });
    }
}
export { ModuleSettings };
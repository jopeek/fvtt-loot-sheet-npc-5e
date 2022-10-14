import { MODULE } from '../../data/moduleConstants.js';
import { LootSheetSettingsConfigApp } from './LootSheetConfigApp.js';

/**
 * @module lootsheetnpc5e.ModuleSettings
 */
export class LootSheetSettings {
    /**
     * @module lootsheetnpc5e.ModuleSettings.registerSettings
     *
     * @description Register ModuleSettings with core Foundry
     * @static
     */
    static registerSettings() {
        /**
         *
         * @description Register the settings for the LootSheetNPC5e Module
         *
         * For sanity reasons, all settings keys are taken from the moduleConstants
         * > This makes it easier to find the key in the codebase.
         * > This also makes it easier to change the key if needed (instead of search an replace).
         *
         * > Downside is that it's an extra step to keep in mind.
         * > If you add a key, you need to add it in the moduleConstants as well.
         * > If you remove a key, you should remove it from the moduleConstants as well.
         *
         * > Keys are named in a way that a settings key always should have a related translation key.
         *
         */


        game.settings.registerMenu(MODULE.ns, MODULE.settings.keys.sheet.advancedOptions, {
            name: game.i18n.localize('lsnpc.settings.menu.advancedOptions.name'),
            label: game.i18n.localize('lsnpc.settings.menu.advancedOptions.label'),
            icon: "fas fa-user-cog",
            type: LootSheetSettingsConfigApp,
            restricted: true
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.sheetUpdate, {
            name: game.i18n.localize('lsnpc.settings.sheet.sheetUpdate.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.sheetUpdate.hint'),
            scope: MODULE.settings.scopes.world,
            config: true,
            default: true,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.chatGracePeriod, {
                name: game.i18n.localize('lsnpc.settings.sheet.chatGracePeriod.name'),
                hint: game.i18n.localize('lsnpc.settings.sheet.chatGracePeriod.hint'),
                scope: MODULE.settings.scopes.world,
                config:true,
                default: 60,
                range: {
                    min: 0,
                    max: 300,
                    step: 5,
                },
                type: Number,
            }
        );


        game.settings.register(MODULE.ns, MODULE.settings.keys.common.useBetterRolltables, {
            name: game.i18n.localize('lsnpc.settings.useBetterRolltables.name'),
            hint: game.i18n.localize('lsnpc.settings.useBetterRolltables.hint'),
            scope: MODULE.settings.scopes.world,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.filterNaturalWeapons, {
            name: game.i18n.localize('lsnpc.settings.sheet.filterNaturalWeapons.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.filterNaturalWeapons.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.moduleDefaults,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.colorRarity, {
            name: game.i18n.localize('lsnpc.settings.sheet.colorRarity.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.colorRarity.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.ui,
            config: true,
            default: true,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.lootItem, {
            name: game.i18n.localize('lsnpc.settings.sheet.lootItem.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.lootItem.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.tradeItems, {
            name: game.i18n.localize('lsnpc.settings.sheet.tradeItems.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.tradeItems.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.moduleDefaults,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.lootAll, {
            name: game.i18n.localize('lsnpc.settings.sheet.lootAll.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.lootAll.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.convertCurrency, {
            name: game.i18n.localize('lsnpc.settings.sheet.convertCurrency.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.convertCurrency.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.lootCurrency, {
            name: game.i18n.localize('lsnpc.settings.sheet.lootCurrency.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.lootCurrency.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.distributeCurrency, {
            name: game.i18n.localize('lsnpc.settings.sheet.distributeCurrency.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.distributeCurrency.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.includeCurrencyWeight, {
            name: game.i18n.localize('lsnpc.settings.sheet.includeCurrencyWeight.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.includeCurrencyWeight.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.loot,
            config: false,
            default: false,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.generateChatMessages , {
            name: game.i18n.localize('lsnpc.settings.sheet.generateChatMessages.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.generateChatMessages.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.moduleDefaults,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.buyItem, {
            name: game.i18n.localize('lsnpc.settings.sheet.buyItem.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.buyItem.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.merchant,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.stackBuyConfirm, {
            name: game.i18n.localize('lsnpc.settings.sheet.stackBuyConfirm.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.stackBuyConfirm.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.merchant,
            config: false,
            default: true,
            type: Boolean
        });


        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.showStackWeight, {
            name: game.i18n.localize('lsnpc.settings.sheet.showStackWeight.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.showStackWeight.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.merchant,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.reduceUpdateVerbosity, {
            name: game.i18n.localize('lsnpc.settings.sheet.reduceUpdateVerbosity.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.reduceUpdateVerbosity.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.moduleDefaults,
            config: false,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.maxPriceIncrease, {
            name: game.i18n.localize('lsnpc.settings.sheet.maxPriceIncrease.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.maxPriceIncrease.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.merchant,
            config: false,
            default: 200,
            type: Number
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.minPriceIncrease, {
            name: game.i18n.localize('lsnpc.settings.sheet.minPriceIncrease.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.minPriceIncrease.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.merchant,
            config: false,
            default: 0,
            type: Number
        });

        /**
         * UI and Themes
         */
    }
}
import { MODULE } from '../data/moduleConstants.js';
import { lootsheetSettingsConfigApp } from '../apps/settings/lootsheetConfigApp.js';

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
            name: game.i18n.localize('lsnpc.settings.menu.advancedOptions.name'),
            label: game.i18n.localize('lsnpc.settings.menu.advancedOptions.label'),
            icon: "fas fa-user-cog",
            type: lootsheetSettingsConfigApp,
            restricted: true
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.common.autoCheckUpdates, {
            name: game.i18n.localize('lsnpc.settings.autoCheckUpdates.name'),
            hint: game.i18n.localize('lsnpc.settings.autoCheckUpdates.hint'),
            scope: MODULE.settings.scopes.world,
            config: true,
            default: true,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.common.useBetterRolltables, {
            name: game.i18n.localize('lsnpc.settings.useBetterRolltables.name'),
            hint: game.i18n.localize('lsnpc.settings.useBetterRolltables.hint'),
            scope: MODULE.settings.scopes.world,
            config: true,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.filterNaturalWeapons, {
            name: game.i18n.localize('lsnpc.settings.sheet.filterNaturalWeapons.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.filterNaturalWeapons.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
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
            group: MODULE.settings.groups.default,
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

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.includeCurrencyWeight, {
            name: game.i18n.localize('lsnpc.settings.sheet.includeCurrencyWeight.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.includeCurrencyWeight.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
            config: false,
            default: false,
            type: Boolean,
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.generateChatMessages , {
            name: game.i18n.localize('lsnpc.settings.sheet.generateChatMessages.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.generateChatMessages.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
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
            group: MODULE.settings.groups.default,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.reduceUpdateVerbosity, {
            name: game.i18n.localize('lsnpc.settings.sheet.reduceUpdateVerbosity.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.reduceUpdateVerbosity.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.default,
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

        /**
         * UI and Themes
         */

        game.settings.register(MODULE.ns, MODULE.settings.keys.sheet.useCondensedLootsheet, {
            name: game.i18n.localize('lsnpc.settings.sheet.useCondensedLootsheet.name'),
            hint: game.i18n.localize('lsnpc.settings.sheet.useCondensedLootsheet.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.sheet.ui,
            config: true,
            default: false,
            type: Boolean,
        });
    }
}
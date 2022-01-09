/**
 * Module default constants
 * @module lootsheetnpc5e.config
 */

/**
 * @module lootsheetnpc5e.config.Module
 * @type {object}
 */
export const MODULE = {
    appIds: {
        lootsheet: 'lootsheetnpc5e',
        lootpopulatorSettings: 'lootsheetnpc5e-lootpopulator-settings',
        lootsheetSettings: 'lootsheetnpc5e-lootsheet-settings',
        ruleEditor: 'lootsheetnpc5e-rule-editor',
    },
    flags: {
        rolltable: 'rolltable',
        loot: 'loot',
        shopQty: 'shopQtyFormula',
        clearInventory: 'clearInventory',
        priceModifier: 'priceModifier',
    },
    ns: 'lootsheetnpc5e',
    path: 'modules/lootsheetnpc5e',
    templatePath: 'modules/lootsheetnpc5e/templates',
    templateAppsPath: 'modules/lootsheetnpc5e/templates/apps',
    templatePartialsPath: 'modules/lootsheetnpc5e/templates/partials',
    socket: 'module.lootsheetnpc5e',
    sockettypes: {
        lootItem: 'lootItem',
        lootAll: 'lootAll',
        distributeCurrency: 'distributeCurrency',
        lootCurrency: 'lootCurrency',
        buyItem: 'buyItem',
        buyAll: 'buyAll',
        sheetUpdate: 'sheetUpdate'
    },
    sheets: {
        loot: 'loot',
        merchant: 'merchant'
    },
    settings: {
        scopes: {
            world: 'world',
            client: 'client',
            default: 'defaults'
        },
        groups: {
            sheet: {
                moduleDefaults: 'moduleDefaults',
                ui: 'UI',
                loot: 'Loot',
                merchant: 'Merchant'
            },
            lootpopulator: {
                fallbacks: 'fallbacks',
                customFallbacks: 'customFallbacks',
                creatureTypeFallbacks: 'creatureTypeFallbacks',
                skiplist: 'skiplist',
                defaults: 'creature_defaults',
                creature: 'creature',
                currency: 'currency',
                rulesets: 'rulesets'
            }
        },
        keys: {
            common: {
                useBetterRolltables: 'useBetterRolltables',
                autoCheckUpdates: 'autoCheckUpdates',
                addInterfaceButtons: 'addInterfaceButtons'
            },
            sheet: {
                advancedOptions: 'advancedSheetOptions',
                buyItem: 'buyItem',
                buyAll: 'buyAll',
                colorRarity: 'colorRarity',
                convertCurrency: 'convertCurrency',
                distributeCurrency: 'distributeCurrency',
                priceModifier: 'priceModifier',
                filterNaturalWeapons: 'filterNaturalWeapons',
                generateChatMessages: 'generateChatMessages',
                includeCurrencyWeight: 'includeCurrencyWeight',
                lootAll: 'lootAll',
                lootCurrency: 'lootCurrency',
                lootItem: 'lootItem',
                sheetUpdate: 'sheetUpdate',
                maxPriceIncrease: 'maxPriceIncrease',
                reduceUpdateVerbosity: 'reduceUpdateVerbosity',
                stackBuyConfirm: 'stackBuyConfirm',
                showStackWeight: 'showStackWeight',
                useCondensedLootsheet: 'useCondensedLootsheet'
            },
            lootpopulator: {
                populatorOptions: 'populatorOptions',
                adjustCurrencyWithCR: 'adjustCurrencyWithCR',
                autoPopulateTokens: 'autoPopulateTokens',
                creatureTypeFallbacks: 'creatureTypeFallbacks',
                customFallbackSwitch: 'customFallbackSwitch',
                customFallbacks: 'customFallbacks',
                rulesets: 'rulesets',
                fallbackRolltable: 'fallbackRolltable',
                fallbackShopQty: 'fallbackShopQty',
                fallbackItemQty: 'fallbackItemQty',
                fallbackItemQtyLimit: 'fallbackItemQtyLimit',
                fallbackCurrencyFormula: 'fallbackCurrencyFormula',
                generateCurrency: 'generateCurrency',
                lootCurrencyDefault: 'lootCurrencyDefault',
                useRulesets: 'useRulesets',
                useSkiplist: 'useSkiplist'
            }
        }
    }
};

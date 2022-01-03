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
        lootsheetSettings: 'lootsheetnpc5e-lootsheet-settings'
    },
    flags: {
        rolltable: 'rolltable',
        loot: 'loot',
        shopQty: 'shopQtyFormula',
    },
    ns: 'lootsheetnpc5e',
    path: 'modules/lootsheetnpc5e',
    templatePath: 'modules/lootsheetnpc5e/templates',
    templatePartialsPath: 'modules/lootsheetnpc5e/templates/partials',
    socket: 'module.lootsheetnpc5e',
    sockettypes: {
        lootItem: 'lootItem',
        lootAll: 'lootAll',
        distributeCoins: 'distributeCoins',
        lootCoins: 'lootCoins',
        buyItem: 'buyItem',
        buyAll: 'buyAll',
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
            moduleDefaults: 'moduleDefaults',
            sheet: {
                ui: 'UI',
                loot: 'Loot',
                merchant: 'Merchant',
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
            },
            sheet: {
                advancedOptions: 'advancedSheetOptions',
                buyItem: 'buyItem',
                buyAll: 'buyAll',
                colorRarity: 'colorRarity',
                convertCurrency: 'convertCurrency',
                distributeCoins: 'distributeCoins',
                priceModifier: 'priceModifier',
                filterNaturalWeapons: 'filterNaturalWeapons',
                generateChatMessages: 'generateChatMessages',
                includeCurrencyWeight: 'includeCurrencyWeight',
                lootAll: 'lootAll',
                lootCurrency: 'lootCurrency',
                lootItem: 'lootItem',
                maxPriceIncrease: 'maxPriceIncrease',
                reduceUpdateVerbosity: 'reduceUpdateVerbosity',
                stackBuyConfirm: 'stackBuyConfirm',
                showStackWeight: 'showStackWeight',
                useCondensedLootsheet: 'useCondensedLootsheet',
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
                generateCurrency: 'generateCurrency',
                lootCurrencyDefault: 'lootCurrencyDefault',
                useRulesets: 'useRulesets',
                useSkiplist: 'useSkiplist'
            }
        }
    }
};

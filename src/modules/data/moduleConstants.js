/**
 * Module default constants
 * @module lootsheetnpc5e.config
 */

/**
 * @module lootsheetnpc5e.config.Module
 *
 * @type {object}
 */
export const MODULE = {
    appIds: {
        lootsheet: 'lootsheetnpc5e',
        lootseederSettings: 'lootsheetnpc5e-seeder-settings',
        lootsheetSettings: 'lootsheetnpc5e-lootsheet-settings',
        ruleEditor: 'lootsheetnpc5e-rule-editor',
    },
    flags: {
        currencyFormula: 'currencyFormula',
        rolltable: 'rolltable',
        loot: 'loot',
        shopQty: 'shopQty',
        shopQtyFormula: 'shopQtyFormula',
        itemQty: 'itemQty',
        itemQtyLimit: 'itemQtyLimit',
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
        tradeItems: 'tradeItems',
        buyAll: 'buyAll',
        sheetUpdate: 'sheetUpdate'
    },
    sheets: {
        loot: 'loot',
        merchant: 'merchant',
        shop: 'shop',
        account: 'account',
        object: 'object',
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
            lootseeder: {
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
                chatGracePeriod: 'chatGracePeriod',
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
                tradeItems: 'tradeItems'
            },
            lootseeder: {
                seederOptions: 'seederOptions',
                adjustCurrencyWithCR: 'adjustCurrencyWithCR',
                autoSeedTokens: 'autoSeedTokens',
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

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
    ns: 'lootsheetnpc5e',
    path: 'modules/lootsheetnpc5e',
    templatePath: 'modules/lootsheetnpc5e/template',
    socket: 'module.lootsheetnpc5e',
    sockettypes: {
        lootItem: 'lootItem',
        lootAll: 'lootAll',
        distributeCoins: 'distributeCoins',
        lootCoins: 'lootCoins',
        buyItem: 'buyItem',
        buyAll: 'buyAll',
    },
    settings: {
        scopes: {
            world: 'world',
            client: 'client',
            default: 'defaults'
        },
        groups: {
            sheet: {
                ui: 'UI',
                loot: 'Loot',
                merchant: 'Merchant',
            },
            lootpopulator: {
                customFallbacks: 'custom_fallbacks',
                skiplist: 'skiplist',
                defaults: 'creature_defaults'
            }
        },
        keys: {
            common: {
                useBetterRolltables: 'useBetterRolltables'                
            },            
            sheet: {
                advancedOptions: 'advancedSheetOptions',
                autoCheckUpdates: 'autoCheckUpdates',
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
                advancedOptions: 'advancedPopulatorOptions',
                autoPopulateTokens: 'autoPopulateTokens',
            }
        }
    }
};

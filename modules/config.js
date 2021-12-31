/**
 * Module default constants
 * @module lootsheetnpc5e.config
 */

/**
 * @module lootsheetnpc5e.config.Module
 * @type {object}
 */
export const MODULE = {
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
    keys: {
        priceModifier: 'priceModifier'
    }
};

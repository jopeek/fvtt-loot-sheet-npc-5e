import { MODULE } from '../../data/moduleConstants.js';
import { PopulatorSettingsConfigApp } from './populatorConfigApp.js';
import { tableHelper } from '../../helper/tableHelper.js';

export class PopulatorSettings {

    static registerSettings() {
        game.settings.registerMenu(MODULE.ns, MODULE.settings.keys.lootpopulator.populatorOptions, {
            name: game.i18n.localize('lsnpc.settings.menu.populatorOptions.name'),
            label: game.i18n.localize('lsnpc.settings.menu.populatorOptions.label'),
            icon: "fas fa-user-cog",
            type: PopulatorSettingsConfigApp,
            restricted: true
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.autoPopulateTokens, {
            name: game.i18n.localize('lsnpc.settings.populator.autoPopulateTokens.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.autoPopulateTokens.hint'),
            scope: MODULE.settings.scopes.world,
            config: true,
            default: true,
            type: Boolean
        });


        game.settings.register(MODULE.ns, MODULE.settings.keys.common.addInterfaceButtons, {
            name: game.i18n.localize('lsnpc.settings.common.addInterfaceButtons.name'),
            hint: game.i18n.localize('lsnpc.settings.common.addInterfaceButtons.hint'),
            scope: MODULE.settings.scopes.world,
            config: true,
            default: true,
            type: Boolean
        });

        this._registerDefaultFallbacks();
        this._registerCurrencySettings();
        this._registerCustomFallbacks();
        this._registerCreatureTypeFallbacks();
        this._registerSkiplistSettings();
    }

    /**
       * General default settings of the module
       */
     static async _registerDefaultFallbacks() {
        const rolltables = await tableHelper.getGameWorldRolltables();
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackRolltable, {
            name: game.i18n.localize('lsnpc.settings.populator.fallbackRolltable.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.fallbackRolltable.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: 0,
            type: String,
            choices: rolltables
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackShopQty, {
            name: game.i18n.localize('lsnpc.settings.populator.fallbackShopQty.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.fallbackShopQty.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackItemQty, {
            name: game.i18n.localize('lsnpc.settings.populator.fallbackItemQty.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.fallbackItemQty.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackItemQtyLimit, {
            name: game.i18n.localize('lsnpc.settings.populator.fallbackItemQtyLimit.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.fallbackItemQtyLimit.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackCurrencyFormula, {
            name: game.i18n.localize('lsnpc.settings.populator.fallbackCurrencyFormula.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.fallbackCurrencyFormula.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: '1d4[gp], 1d4[sp], 1d4[cp]',
            type: String
        });
    }

    static async _registerCreatureTypeFallbacks() {
        const creatureTypes = this.creatureTypes;
        if (creatureTypes && creatureTypes.length > 0) {
            game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.creatureTypeFallbacks, {
                name: game.i18n.localize('lsnpc.settings.populator.creatureTypeFallbacks.name'),
                hint: game.i18n.localize('lsnpc.settings.populator.creatureTypeFallbacks.hint'),
                scope: MODULE.settings.scopes.world,
                group: MODULE.settings.groups.lootpopulator.creatureTypeFallbacks,
                config: false,
                default: true,
                type: Boolean
            });

            const rolltables = await tableHelper.getGameWorldRolltables();
            creatureTypes.forEach((creaturType, i) => {
                game.settings.register(MODULE.ns, "creaturetype_default_" + creaturType + '_table', {
                    name:  game.i18n.localize(creaturType + 's'),
                    scope: MODULE.settings.scopes.world,
                    group: MODULE.settings.groups.lootpopulator.creatureTypeFallbacks,
                    config: false,
                    default: 0,
                    type: String,
                    choices: rolltables
                });
            });
        }
    }

    static async _registerCustomFallbacks() {
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.useRulesets, {
            name: game.i18n.localize('lsnpc.settings.populator.useRulesets.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.useRulesets.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.rulesets,
            config: false,
            default: true,
            type: Boolean
        });

        const rolltables = await tableHelper.getGameWorldRolltables(),
            customFallbacks = this.customFallbackDefaults;

        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.rulesets, {
            name: "-Rulesets-",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.rulesets,
            config: false,
            actions: {
                new: {
                    data: rolltables
                }
            },
            default: customFallbacks,
            type: Object
        });
    }

    static _registerCurrencySettings() {
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.generateCurrency, {
            name: game.i18n.localize('lsnpc.settings.populator.generateCurrency.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.generateCurrency.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.currency,
            config: false,
            default: false,
            type: Boolean
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.adjustCurrencyWithCR, {
            name: game.i18n.localize('lsnpc.settings.populator.adjustCurrencyWithCR.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.adjustCurrencyWithCR.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.currency,
            config: false,
            default: false,
            type: Boolean
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.lootCurrencyDefault, {
            name: game.i18n.localize('lsnpc.settings.populator.lootCurrencyDefault.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.lootCurrencyDefault.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.currency,
            config: false,
            default: "1d4[gp], 1d20[sp], 1d50[cp]",
            type: String
        });
    }

    static _registerSkiplistSettings() {
        const creatureTypes = this.creatureTypes;
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.useSkiplist, {
            name: game.i18n.localize('lsnpc.settings.populator.useSkiplist.name'),
            hint: game.i18n.localize('lsnpc.settings.populator.useSkiplist.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.skiplist,
            config: false,
            default: false,
            type: Boolean
        });
        creatureTypes.forEach((item, i) => {
            let setting = "skiplist_" + item;
            game.settings.register(MODULE.ns, setting, {
                name: game.i18n.format(item),
                label: game.i18n.format("Skiplist"),
                group: MODULE.settings.groups.lootpopulator.skiplist,
                config: false,
                default: false,
                scope: MODULE.settings.scopes.world,
                type: Boolean
            });
        });
    }

    static get customFallbackDefaults() {
        return {
            'data.data.details.cr_<=_1': {
                name: 'CR1',
                filters: [
                    {
                        path: 'data.data.details.cr',
                        comparison: '<=',
                        value: 1
                    }
                ],
                rolltable: 'uuid_reference_to_rolltable',
                tags: '',
                state: false
            },
            'data.data.details.cr_>=_4': {
                name: 'CR1',
                filters: [
                    {
                        path: 'actor.labels.name',
                        comparison: '!=',
                        value: 'Lorem'
                    }
                ],
                rolltable: 'uuid_reference_to_rolltable',
                tags: '',
                state: false
            },
        };
    }

    /**
     * Get the systems creature types.
     *
     * @returns {Array} creatureTypes
     */
    static get creatureTypes() {
        return Object.keys(CONFIG[game.system.id.toUpperCase()]?.creatureTypes) ?? [];
    }
}

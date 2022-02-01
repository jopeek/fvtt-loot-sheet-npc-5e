import { MODULE } from '../../data/moduleConstants.js';
import { LootSeederSettingsConfigApp } from './LootSeederConfigApp.js';
import { TableHelper } from '../../helper/TableHelper.js';

export class PopulatorSettings {

    static registerSettings() {
        game.settings.registerMenu(MODULE.ns, MODULE.settings.keys.lootseeder.seederOptions, {
            name: game.i18n.localize('lsnpc.settings.menu.seederOptions.name'),
            label: game.i18n.localize('lsnpc.settings.menu.seederOptions.label'),
            icon: "fas fa-user-cog",
            type: LootSeederSettingsConfigApp,
            restricted: true
        });

        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.autoSeedTokens, {
            name: game.i18n.localize('lsnpc.settings.seeder.autoSeedTokens.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.autoSeedTokens.hint'),
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
        const rolltables = await TableHelper.getGameWorldRolltables();
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackRolltable, {
            name: game.i18n.localize('lsnpc.settings.seeder.fallbackRolltable.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.fallbackRolltable.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.fallbacks,
            config: false,
            default: 0,
            type: String,
            choices: rolltables
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackShopQty, {
            name: game.i18n.localize('lsnpc.settings.seeder.fallbackShopQty.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.fallbackShopQty.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackItemQty, {
            name: game.i18n.localize('lsnpc.settings.seeder.fallbackItemQty.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.fallbackItemQty.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackItemQtyLimit, {
            name: game.i18n.localize('lsnpc.settings.seeder.fallbackItemQtyLimit.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.fallbackItemQtyLimit.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackCurrencyFormula, {
            name: game.i18n.localize('lsnpc.settings.seeder.fallbackCurrencyFormula.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.fallbackCurrencyFormula.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.fallbacks,
            config: false,
            default: '1d4[gp], 1d4[sp], 1d4[cp]',
            type: String
        });
    }

    static async _registerCreatureTypeFallbacks() {
        const creatureTypes = this.creatureTypes;
        if (creatureTypes && creatureTypes.length > 0) {
            game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.creatureTypeFallbacks, {
                name: game.i18n.localize('lsnpc.settings.seeder.creatureTypeFallbacks.name'),
                hint: game.i18n.localize('lsnpc.settings.seeder.creatureTypeFallbacks.hint'),
                scope: MODULE.settings.scopes.world,
                group: MODULE.settings.groups.lootseeder.creatureTypeFallbacks,
                config: false,
                default: true,
                type: Boolean
            });

            const rolltables = await TableHelper.getGameWorldRolltables();
            creatureTypes.forEach((creaturType, i) => {
                game.settings.register(MODULE.ns, "creaturetype_default_" + creaturType + '_table', {
                    name:  game.i18n.localize(creaturType + 's'),
                    scope: MODULE.settings.scopes.world,
                    group: MODULE.settings.groups.lootseeder.creatureTypeFallbacks,
                    config: false,
                    default: 0,
                    type: String,
                    choices: rolltables
                });
            });
        }
    }

    static async _registerCustomFallbacks() {
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.useRulesets, {
            name: game.i18n.localize('lsnpc.settings.seeder.useRulesets.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.useRulesets.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.rulesets,
            config: false,
            default: true,
            type: Boolean
        });

        const rolltables = await TableHelper.getGameWorldRolltables(),
            customFallbacks = this.customFallbackDefaults;

        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.rulesets, {
            name: "-Rulesets-",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.rulesets,
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
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.generateCurrency, {
            name: game.i18n.localize('lsnpc.settings.seeder.generateCurrency.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.generateCurrency.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.currency,
            config: false,
            default: false,
            type: Boolean
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.adjustCurrencyWithCR, {
            name: game.i18n.localize('lsnpc.settings.seeder.adjustCurrencyWithCR.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.adjustCurrencyWithCR.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.currency,
            config: false,
            default: false,
            type: Boolean
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.lootCurrencyDefault, {
            name: game.i18n.localize('lsnpc.settings.seeder.lootCurrencyDefault.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.lootCurrencyDefault.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.currency,
            config: false,
            default: "1d4[gp], 1d20[sp], 1d50[cp]",
            type: String
        });
    }

    static _registerSkiplistSettings() {
        const creatureTypes = this.creatureTypes;
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootseeder.useSkiplist, {
            name: game.i18n.localize('lsnpc.settings.seeder.useSkiplist.name'),
            hint: game.i18n.localize('lsnpc.settings.seeder.useSkiplist.hint'),
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootseeder.skiplist,
            config: false,
            default: false,
            type: Boolean
        });
        creatureTypes.forEach((item, i) => {
            let setting = "skiplist_" + item;
            game.settings.register(MODULE.ns, setting, {
                name: game.i18n.format(item),
                label: game.i18n.format("Skiplist"),
                group: MODULE.settings.groups.lootseeder.skiplist,
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

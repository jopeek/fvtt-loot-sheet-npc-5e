import { MODULE } from '../../data/config.js';
import { LootPopulatorSettingsConfig } from '../../apps/lootPopulatorConfig.js';
import { tableHelper } from '../../helper/tableHelper.js';

export class PopulatorSettings {

    static registerSettings() {
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.autoPopulateTokens, {
            name: "Auto populate tokens with loot",
            hint: "If an actor has a rolltable assigned to it, should the token be populated with the Loot?",
            scope: MODULE.settings.scopes.world,
            config: true,
            default: true,
            type: Boolean
        });

        game.settings.registerMenu(MODULE.ns, MODULE.settings.keys.lootpopulator.advancedOptions, {
            name: game.i18n.format("Advanced Populator Options"),
            label: game.i18n.format("Loot population settings"),
            icon: "fas fa-user-cog",
            type: LootPopulatorSettingsConfig,
            restricted: true
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
            name: "fallbackRolltable",
            hint: "If no lootsheet rolltable is assigned to an actor, this will be used as a fallback table.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: 0,
            type: String,
            choices: rolltables
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackShopQty, {
            name: "Shop quantity",
            hint: "If no lootsheet shop quantity is assigned to an actor, this will be used as a fallback shop quantity.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackItemQty, {
            name: "Item quantity",
            hint: "If no lootsheet item quantity is assigned to an actor, this will be used as a fallback item quantity.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.fallbackItemQtyLimit, {
            name: "Item quantity limit",
            hint: "If no lootsheet item quantity limit is assigned to an actor, this will be used as a fallback item quantity limit.",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.fallbacks,
            config: false,
            default: '1d2',
            type: String
        });
    }

    static async _registerCreatureTypeFallbacks() {
        const creatureTypes = this.creatureTypes;
        if (creatureTypes && creatureTypes.length > 0) {
            game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.creatureTypeFallbacks, {
                name: "Fallback per creature type",
                hint: "Assign default/fallback rolltable per creatureType?",
                scope: MODULE.settings.scopes.world,
                group: MODULE.settings.groups.lootpopulator.creatureTypeFallbacks,
                config: false,
                default: true,
                type: Boolean
            });

            const rolltables = await tableHelper.getGameWorldRolltables();
            creatureTypes.forEach((creaturType, i) => {
                game.settings.register(MODULE.ns, "creaturetype_default_" + creaturType + '_table', {
                    name: creaturType + 's',
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
            name: "Use custom rules",
            hint: 'Custom rules to test against a token and populate.',
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.rulesets,
            config: false,
            default: true,
            type: Boolean
        });

        const rolltables = await tableHelper.getGameWorldRolltables(),
            customFallbacks = this.customFallbackDefaults;

        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.rulesets, {
            name: "Fallback based on challenge rating",
            hint: "Assign default/fallback rolltable per CR?",
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
            name: "Add currency?",
            hint: "Generate and add currency when populating a token?",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.currency,
            config: false,
            default: false,
            type: Boolean
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.adjustCurrencyWithCR, {
            name: "Adjust added currency with CR",
            hint: "If enabled added currency will be slightly adjusted by the CR (rollFormula + rounden up CR).",
            scope: MODULE.settings.scopes.world,
            group: MODULE.settings.groups.lootpopulator.currency,
            config: false,
            default: false,
            type: Boolean
        });
        game.settings.register(MODULE.ns, MODULE.settings.keys.lootpopulator.lootCurrencyDefault, {
            name: "Default loot currency",
            hint: "The default formula for loot currency generation.",
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
            name: game.i18n.format("Use Skiplist"),
            hint: game.i18n.format("Use skiplist to ignore monster types during population?"),
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
                rolltable: 'rolltableid',
                rolltableName: 'A Rolltable',
                tags: 'lorem, ipsum',
                active: false
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
                rolltable: 'rolltableId',
                rolltableName: 'A Rolltable',
                tags: 'lorem, ipsum',
                active: false
            },
        };
    }

    /**
     * Get the systems creature types.
     *
     * @returns {Array} creatureTypes
     */
    static get creatureTypes() {
        if (game.system.id == 'dnd5e')
            return Object.keys(CONFIG.DND5E.creatureTypes);
    }
}

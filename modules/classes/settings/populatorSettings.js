import { MODULE } from '../../data/config.js';
import { LootPopulatorSettingsConfig } from '../../apps/lootPopulatorConfig.js';

export class PopulatorSettings {
    constructor() {
        this.availableRolltables = {};
        this.hasBetterRolltables = (typeof game.betterTables !== "undefined");
        this.creatureTypes = this._getCreatureTypes();
        this.customFallbackDefaults = this.getCustomFallbackDefaults();
        this.setRolltables();
        this.gs = game.settings;
        //add empty default to rolltable dropdown
        return this;
    }
    /**
     * Get the systems creature types.
     *
     * @returns {Array} creatureTypes
     */
    _getCreatureTypes() {
        if (game.system.id == 'dnd5e')
            return Object.keys(CONFIG.DND5E.creatureTypes);
    }
    /**
     * set all available rolltables
     */
    async setRolltables() {
        await this._getGameWorldRolltables();
    }

    static registerSettings() {
        game.settings.register(MODULE.ns, MODULE.settings.keys.populator.autoPopulateTokens, {
            name: "Auto populate tokens with loot",
            hint: "If an actor has a rolltable assigned to it, should the token be populated with the Loot?",
            scope: MODULE.settings.scopes.world,
            config: true,
            default: true,
            type: Boolean
        });
        game.settings.registerMenu(MODULE.ns, MODULE.settings.keys.common.advancedOptions, {
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
     *
     * @return void
     */
    async _getGameWorldRolltables() {
        const rollTablePacks = game.packs.filter((e) => e.documentName === "RollTable");
        this.availableRolltables = {};
        if (game.tables.size > 0)
            this.availableRolltables["World"] = [];
        for (const table of game.tables) {
            this.availableRolltables["World"].push({
                name: table.name,
                uuid: `RollTable.${table.id}`,
            });
        }
        for (const pack of rollTablePacks) {
            const idx = await pack.getIndex();
            this.availableRolltables[pack.metadata.label] = [];
            const tableString = `Compendium.${pack.collection}.`;
            for (let table of idx) {
                this.availableRolltables[pack.metadata.label].push({
                    name: table.name,
                    uuid: tableString + table._id,
                });
            }
        }
        console.debug("LootPopulator | Rollable Tables found", this.availableRolltables);
    }
    /**
       * General default settings of the module
       */
    _registerDefaultFallbacks() {
        this.gs.register(MODULE.ns, "fallbackRolltable", {
            name: "fallbackRolltable",
            hint: "If no lootsheet rolltable is assigned to an actor, this will be used as a fallback table.",
            scope: MODULE.settings.scopes.world,
            group: GROUP_DEFAULT,
            config: false,
            default: 0,
            type: String,
            choices: this.availableRolltables
        });
        this.gs.register(MODULE.ns, "fallbackShopQty", {
            name: "Shop quantity",
            hint: "If no lootsheet shop quantity is assigned to an actor, this will be used as a fallback shop quantity.",
            scope: MODULE.settings.scopes.world,
            group: GROUP_DEFAULT,
            config: false,
            default: '1d2',
            type: String
        });
        this.gs.register(MODULE.ns, "fallbackItemQty", {
            name: "Item quantity",
            hint: "If no lootsheet item quantity is assigned to an actor, this will be used as a fallback item quantity.",
            scope: MODULE.settings.scopes.world,
            group: GROUP_DEFAULT,
            config: false,
            default: '1d2',
            type: String
        });
        this.gs.register(MODULE.ns, "fallbackItemQtyLimit", {
            name: "Item quantity limit",
            hint: "If no lootsheet item quantity limit is assigned to an actor, this will be used as a fallback item quantity limit.",
            scope: MODULE.settings.scopes.world,
            group: GROUP_DEFAULT,
            config: false,
            default: '1d2',
            type: String
        });
    }
    _registerCreatureTypeFallbacks() {
        if (this.creatureTypes && this.creatureTypes.length > 0) {
            this.gs.register(MODULE.ns, "creatureTypeFallbacks", {
                name: "Fallback per creature type",
                hint: "Assign default/fallback rolltable per creatureType?",
                scope: MODULE.settings.scopes.world,
                group: GROUP_CREATURE,
                config: false,
                default: true,
                type: Boolean
            });
            this.creatureTypes.forEach((creaturType, i) => {
                this.gs.register(MODULE.ns, "creaturetype_default_" + creaturType + '_table', {
                    name: creaturType + 's',
                    scope: MODULE.settings.scopes.world,
                    group: GROUP_CREATURE,
                    config: false,
                    default: 0,
                    type: String,
                    choices: this.availableRolltables
                });
            });
        }
    }
    _registerCustomFallbacks() {
        this.gs.register(MODULE.ns, "customFallbackSwitch", {
            name: "Use custom rules",
            hint: 'Custom rules to test against a token and populate.',
            scope: MODULE.settings.scopes.world,
            group: GROUP_CF,
            config: false,
            default: true,
            type: Boolean
        });
        this.gs.register(MODULE.ns, "customFallbacks", {
            name: "Fallback based on challenge rating",
            hint: "Assign default/fallback rolltable per CR?",
            scope: MODULE.settings.scopes.world,
            group: GROUP_CF,
            config: false,
            actions: {
                new: {
                    data: this.availableRolltables
                }
            },
            default: this.customFallbackDefaults,
            type: Object
        });
    }
    _registerCurrencySettings() {
        this.gs.register(MODULE.ns, "generateCurrency", {
            name: "Add currency?",
            hint: "Generate and add currency when populating a token?",
            scope: MODULE.settings.scopes.world,
            config: true,
            default: false,
            type: Boolean
        });
        this.gs.register(MODULE.ns, "adjustCurrencyWithCR", {
            name: "Adjust added currency with CR",
            hint: "If enabled added currency will be slightly adjusted by the CR (rollFormula + rounden up CR).",
            scope: MODULE.settings.scopes.world,
            config: true,
            default: false,
            type: Boolean
        });
        this.gs.register(MODULE.ns, "lootCurrencyDefault", {
            name: "Default loot currency",
            hint: "The default formula for loot currency generation.",
            scope: MODULE.settings.scopes.world,
            group: GROUP_DEFAULT,
            config: false,
            default: "1d4[gp], 1d20[sp], 1d50[cp]",
            type: String
        });
    }
    _registerSkiplistSettings() {
        this.gs.register(MODULE.ns, "useSkiplist", {
            name: game.i18n.format("Use Skiplist"),
            hint: game.i18n.format("Use skiplist to ignore monster types during population?"),
            scope: MODULE.settings.scopes.world,
            group: GROUP_SKIPLIST,
            config: false,
            default: false,
            type: Boolean
        });
        this.creatureTypes.forEach((item, i) => {
            let setting = "skiplist_" + item;
            this.gs.register(MODULE.ns, setting, {
                name: game.i18n.format(item),
                label: game.i18n.format("Skiplist"),
                group: GROUP_SKIPLIST,
                config: false,
                default: false,
                scope: MODULE.settings.scopes.world,
                type: Boolean
            });
        });
    }
    getCustomFallbackDefaults() {
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
                rolltable: 'A CR1 Rolltable',
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
}

import { LootProcessor } from "../classes/LootProcessor.js";
import { TableRoller } from "../classes/TableRoller.js";
import { MODULE } from "../data/moduleConstants.js";
import { CurrencyHelper } from "./CurrencyHelper.js";

export class ActorHelper {

    /**
     *
     * @param {Actor} actor
     *
     * @returns {Array<string>} a list of RollTable.uuids
     *
     */
    static getRollTables(actor) {
        const creatureType = actor.data.data.details.type.value,
            rolltableFromActor = this.getLinkedRolltable(actor),
            rolltableByCreature = this.getLinkedRolltableByCreatureType(creatureType),
            rolltableByFilters = this.getLinkedRolltableByFilters(actor),
            rolltableDefault = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.fallbackRolltable) || [];
        let rolltables = [];

        if (rolltableFromActor) {
            rolltables.push(rolltableFromActor);
        } else if (rolltableByFilters) {
            rolltables = rolltables.concat(...rolltableByFilters);
        } else if (rolltableByCreature) {
            rolltables.push(rolltableByCreature);
        } else {
            rolltables.push(rolltableDefault);
        }

        return rolltables;
    }

    /**
     *
     * @param {Actor} actor
     * @returns {String|false} a RollTable.uuid
     */
     static getLinkedRolltable(actor) {
        let rolltable = actor.getFlag(MODULE.ns, MODULE.flags.rolltable);

        if (rolltable == 0) return false;

        if (rolltable && rolltable.indexOf('.') == -1) {
            //no uuid, so we need to find the uuid
            //we assume rolltable is an old name reeference to a rolltable and try to find it
            let newReference = game.tables.getName(rolltable);

            if (!newReference) {
                ui.notifications.warn(`A rolltable for "${rolltable}" was not found.`);
                return false;
            }

            ui.notifications.warn(`${actor.name} had an old (now invalid) rolltable flag.`);
            ui.notifications.info(`Found a rolltable for "${newReference.name}" with id "${newReference.uuid}"`);
            ui.notifications.info(`Reassign a new rolltable or try the runMigarations Macro from the compendium to get rid of this issue.`);
            return newReference.uuid;
        }

        return rolltable;
    }

    /**
     *
     * @param {Actor} actor
     * @returns {Array<String>|false}
     */
     static getLinkedRolltableByFilters(actor) {
        const filterRules = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.rulesets) || false;
        let rolltable = false;

        for (const key in filterRules) {
            if (ActorHelper.passesFilter(actor, filterRules[key].filters)) {
                if (!rolltable) rolltable = [];

                rolltable.push(filterRules[key].rolltable);
            }
        }

        return rolltable;
    }

    /**
     *
     * @param {String} creatureType
     * @returns {String|false} a RollTable.id
     */
     static getLinkedRolltableByCreatureType(creatureType) {
        if (!creatureType || creatureType.length === 0) return false;

        try {
            const systemCreatureTypes = Object.keys(CONFIG[game.system.id.toUpperCase()]?.creatureTypes) ?? [];
            if (systemCreatureTypes.includes(creatureType)) {
                const creatureTypeKey = `creaturetype_default_${creatureType}_table`,
                    fallback = game.settings.get(MODULE.ns, creatureTypeKey);

                if (fallback && fallback != 0) return fallback;
            }
        } catch (e) {
            console.error(e);
            return false;
        }

        return false;
    }

    /**
     * @summary Check if the given subject passes the given filters
     *
     * @description
     * Applies the given _filter_**s** on the given _subject_'s data properties.
     * If a property defined in filters is **not present** on the _subject_,
     * the the subject **doesn't pass** the _filter_.
     *
     * If a property defined in the _filter_ is **present** on the _subject_,
     * The _subject_.property value is checked according to _filter_.comparison
     * againt a _filter_.value
     *
     *
     * @param {object} subject
     * @param {object} filters
     *
     * @returns {boolean}
     *
     * @author Daniel Böttner <@DanielBoettner>
     *
     * @version 1.0.1
     * @since 3.4.5.3
     *
     * @inheritdoc
     * @function
     * @static
     */
     static passesFilter(subject, filters) {
        for (let filter of Object.values(filters)) {
            let prop = getProperty(subject, `data.${filter.filterpath}`) || getProperty(subject, filter.filterpath);
            if (prop === undefined) return false;
            switch (filter.comparison) {
                case '==': if (prop == filter.value) { return true; } break;
                case '<=': if (prop <= filter.value) { return true; } break;
                case '>=': if (prop >= filter.value) { return true; } break;
                case 'includes': if (prop.includes(filter.value)) { return true; } break;
                default:
                    return false;
            }
        }

        return false;
    }

    /**
    * Roll a table an add the resulting loot to given target(s).
    *
    * @param {RollTable} table
    * @param {Array<Actor|PlaceableObject>|Actor|PlaceableObject} stack
    * @param {options} object
    *
    * @returns
    */
     static async addLootToTarget(stack = null, table = null, options = {}) {
        stack = this.getActorStack(stack);
        if (options?.verbose) ui.notifications.info(MODULE.ns + ' | ActorHelper | Loot generation started for.');

        let tableRoller = new TableRoller(table);

        for (let actor of stack) {
            const rollResults = await tableRoller.roll(options),
                lootProcess = new LootProcessor(rollResults, actor, options),
                betterResults = await lootProcess.buildResults(options);

            await CurrencyHelper.addCurrenciesToActor(actor, betterResults?.currency);
            lootProcess.addItemsToActor(actor, options);
        }

        if (options?.verbose) return ui.notifications.info(MODULE.ns + ' | ActorHelper | Loot generation complete.');
    }

    /**
     * @summary return an Array of actors
     *
     * @description
     * This function will return a tokenstack based on the given argument
     * - If the argument is a token, it will return an array with that token
     * - If the argument is an array, it will return the array
     * - If no argument is given, it will return the currently selected tokens
     *
     * @param {Array<Actor>|null} stack
     *
     * @returns {Array<Actor>}
     */

     static getActorStack(stack = null) {
        let parsedStack = [];
        if (stack) {
            if (Array.isArray(stack)) {
                parsedStack = stack;
            } else {
                parsedStack.push(stack);
            }
        } else {
            parsedStack = canvas.tokens.controlled.map(token => token.actor);
        }

        return parsedStack;
    }

    /**
     *
     * @param {Actor} actor
     *
     * @returns {boolean}
     *
     */
     static skipByCreatureType(actor) {
        if (!game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.useSkiplist)) return false;

        const creatureType = actor.data.data.details.type.value;
        if (!Object.keys(CONFIG.DND5E.creatureTypes).includes(creatureType)) return false;

        return game.settings.get(MODULE.ns, "skiplist_" + creatureType);
    }
}

/**
 *
 * @param {Array} stack
 * @returns {Array<Actor>}
 *
 */
export function getActorStack(stack = null){
    return ActorHelper.getActorStack(stack);
}
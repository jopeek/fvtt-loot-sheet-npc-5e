import { MODULE } from "../data/moduleConstants.js";

/**
 *
 * @param {Actor} actor
 * @returns {String|false} a RollTable.id
 */
export const getLinkedRolltable = (actor) => {
    return actor.getFlag(MODULE.ns, MODULE.flags.rolltable) || false;
}

/**
 *
 * @param {Actor} actor
 * @returns {Array<String>|false}
 */
export const getLinkedRolltableByFilters = (actor) => {
    const filterRules = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.rulesets) || false;
    let rolltable = false;

    for (const key in filterRules) {
        if (passesFilter(actor, filterRules[key].filters)) {
            if (!rolltable) rolltable = [];

            rolltable.push(filterRules[key].rolltable);
        }
    }

    return rolltable;
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
export const passesFilter = (subject, filters) => {
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
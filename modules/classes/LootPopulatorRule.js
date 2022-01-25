/**
 * @module lootpopulatornpc5e.classes.LootPopulatorRule
 * @class LootPopulatorRule
 */
export class LootPopulatorRule {
    constructor() {
        this.name = '';
        this.filters = [];
        this.rolltable = '';
        this.rolltableName = '';
        this.tags = '';
        this.state = false;
    }
}
/**
 * @module lootsheetnpc5e.lootpopulator.classes.RuleFilter
 * @class RuleFilter
 */
export class RuleFilter {
    constructor() {
        this.path = '';
        this.comparison = '';
        this.value = '';
    }
}

import { MODULE } from './config.js';

class ModuleSettings {  

    static registerSettings() {
        const WORLD = 'world';
    
        game.settings.register(MODULE.ns, "useBetterRolltables", {
            name: "Use better rolltables",
            hint: "If installed make use of better rolltables to update Inventory?",
            scope: WORLD,
            config: true,
            default: false,
            type: Boolean
        });
    
        game.settings.register(MODULE.ns, "convertCurrency", {
            name: "Convert currency after purchases?",
            hint: "If enabled, all currency will be converted to the highest denomination possible after a purchase. If disabled, currency will subtracted simply.",
            scope: WORLD,
            config: true,
            default: false,
            type: Boolean
        });
    
        game.settings.register(MODULE.ns, "buyChat", {
            name: "Display chat message for purchases?",
            hint: "If enabled, a chat message will display purchases of items from the loot sheet.",
            scope: WORLD,
            config: true,
            default: true,
            type: Boolean
        });
    
        game.settings.register(MODULE.ns, "stackBuyConfirm", {
            name: "Confirm stack purchase?",
            hint: "If enabled, confirmation is requested when buying an item stack.",
            scope: WORLD,
            config: true,
            default: true,
            type: Boolean
        });
    
        game.settings.register(MODULE.ns, "lootCurrency", {
            name: "Loot currency?",
            hint: "If enabled, players will have the option to loot all currency to their character, in addition to splitting the currency between players.",
            scope: WORLD,
            config: true,
            default: true,
            type: Boolean
        });
    
        game.settings.register(MODULE.ns, "lootAll", {
            name: "Loot all?",
            hint: "If enabled, players will have the option to loot all items to their character, currency will follow the 'Loot Currency?' setting upon Loot All.",
            scope: WORLD,
            config: true,
            default: true,
            type: Boolean
        });
    
        game.settings.register(MODULE.ns, "showStackWeight", {
            name: "Show Stack Weight?",
            hint: "If enabled, shows the weight of the entire stack next to the item weight",
            scope: WORLD,
            config: true,
            default: false,
            type: Boolean
        });
    
        game.settings.register(MODULE.ns, "reduceUpdateVerbosity", {
            name: "Reduce Update Shop Verbosity",
            hint: "If enabled, no notifications will be created every time an item is added to the shop.",
            scope: WORLD,
            config: true,
            default: true,
            type: Boolean
        });
    
        game.settings.register(MODULE.ns, "maxPriceIncrease", {
            name: "Maximum Price Increase",
            hint: "Change the maximum price increase for a merchant in percent",
            scope: WORLD,
            config: true,
            default: 200,
            type: Number
        });
    
        game.settings.register(MODULE.ns, "includeCurrencyWeight", {
            name: "Include Currency Weight",
            hint: "Include the weight of the currency in the Total Weight calculation.",
            scope: WORLD,
            config: true,
            default: false,
            type: Boolean,
        });
        
        /**
         * UI and Themes
         */
             game.settings.register(MODULE.ns, "useCondensedLootsheet", {
                name: "(!) ALPHA (!)Use a condensed lootsheet",
                hint: "Show a more condensed lootsheet to the players?",
                scope: WORLD,
                config: true,
                default: false,
                type: Boolean,
            }); 
    }
}
export { ModuleSettings };
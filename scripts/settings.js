export default {apply:(game) => {
    game.settings.register("lootsheet-simple", "buyChat", {
        name: "Display chat message for purchases?",
        hint: "If enabled, a chat message will display purchases of items from the loot sheet.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("lootsheet-simple", "lootCurrency", {
    name: "Loot currency?",
    hint: "If enabled, players will have the option to loot all currency to their character, in addition to splitting the currency between players.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    });

    game.settings.register("lootsheet-simple", "lootAll", {
    name: "Loot all?",
    hint: "If enabled, players will have the option to loot all items to their character, currency will follow the 'Loot Currency?' setting upon Loot All.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    });

    game.settings.register("lootsheet-simple", "showStackWeight", {
    name: "Show Stack Weight?",
    hint: "If enabled, shows the weight of the entire stack next to the item weight",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    });

    game.settings.register("lootsheet-simple", "reduceUpdateVerbosity", {
    name: "Reduce Update Shop Verbosity",
    hint: "If enabled, no notifications will be created every time an item is added to the shop.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    });

    game.settings.register("lootsheet-simple", "maxPriceIncrease", {
    name: "Maximum Price Increase",
    hint: "Change the maximum price increase for a merchant in percent",
    scope: "world",
    config: true,
    default: 200,
    type: Number,
    });

    game.settings.register("lootsheet-simple", "includeCurrencyWeight", {
    name: "Include Currency Weight",
    hint: "Include the weight of the currency in the Total Weight calculation.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    });
}}
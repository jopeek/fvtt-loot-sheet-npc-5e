import { MODULE } from '../config.js';
import { ItemHelper } from '../helper/ItemHelper.js';
import { ModuleSettings } from '../ModuleSettings.js';
import { API } from '../API.js';

class LootsheetNPC5eHooks {
    /**
     * Hooks on game hooks and attaches methods 
     */
    static init(){
        Hooks.once("init", LootsheetNPC5eHooks.foundryInit);
        Hooks.once("ready", LootsheetNPC5eHooks.foundryReady);
        Hooks.once('setup', LootsheetNPC5eHooks.foundrySetup);
    }

    static foundrySetup()
    {
        const moduleData = game.modules.get(MODULE.ns);

        /**
         * @type {API}
         */
        moduleData.public = {
            API
        };

        // Freeze the public API so it can't be modified.
        Object.freeze(moduleData.public);
    }

    static foundryInit(){
        ModuleSettings.registerSettings();  
        LootsheetNPC5eHooks.socketListener();
    }

    static foundryReady(){
        Handlebars.registerHelper('ifeq', function (a, b, options) {
            return (a == b) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('uneq', function (arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('lootsheetprice', function (basePrice, modifier) {
            return (Math.round(basePrice * modifier * 100) / 100).toLocaleString('en') + " gp";
        });

        Handlebars.registerHelper('lootsheetstackweight', function (weight, qty) {
            let showStackWeight = game.settings.get("lootsheetnpc5e", "showStackWeight");
            if (showStackWeight) {
                return `/${(weight * qty).toLocaleString('en')}`;
            }

            return "";
        });

        Handlebars.registerHelper('lootsheetweight', function (weight) {
            return (Math.round(weight * 1e5) / 1e5).toString();
        });
    }

    static socketListener(){
        game.socket.on(MODULE.socket, data => {
            console.log("Loot Sheet | Socket Message: ", data);
            if (game.user.isGM && data.processorId === game.user.id) {
                if (data.type === "buy") {
                    let buyer = game.actors.get(data.buyerId);
                    let seller = canvas.tokens.get(data.tokenId);
    
                    if (buyer && seller && seller.actor) {
                        ItemHelper.transaction(seller.actor, buyer, data.itemId, data.quantity);
                    }
                    else if (!seller) {
                        ItemHelper.errorMessageToActor(buyer, "GM not available, the GM must on the same scene to purchase an item.")
                        ui.notifications.error("Player attempted to purchase an item on a different scene.");
                    }
                }
    
                if (data.type === "loot") {
                    let looter = game.actors.get(data.looterId);
                    let container = canvas.tokens.get(data.tokenId);
    
                    if (looter && container && container.actor) {
                        ItemHelper.lootItems(container.actor, looter, data.items);
                    }
                    else if (!container) {
                        errorMessageToActor(looter, "GM not available, the GM must on the same scene to loot an item.")
                        ui.notifications.error("Player attempted to loot an item on a different scene.");
                    }
                }
    
                if (data.type === "distributeCoins") {
                    let container = canvas.tokens.get(data.tokenId);
                    if (!container || !container.actor) {
                        ItemHelper.errorMessageToActor(looter, "GM not available, the GM must on the same scene to distribute coins.")
                        return ui.notifications.error("Player attempted to distribute coins on a different scene.");
                    }
                    ItemHelper.distributeCoins(container.actor);
                }
    
                if (data.type === "lootCoins") {
                    let looter = game.actors.get(data.looterId);
                    let container = canvas.tokens.get(data.tokenId);
                    if (!container || !container.actor || !looter) {
                        ItemHelper.errorMessageToActor(looter, "GM not available, the GM must on the same scene to loot coins.")
                        return ui.notifications.error("Player attempted to loot coins on a different scene.");
                    }
                    ItemHelper.lootCoins(container.actor, looter);
                }
            }
            if (data.type === "error" && data.targetId === game.user.actorId) {
                console.log("Loot Sheet | Transaction Error: ", data.message);
                return ui.notifications.error(data.message);
            }
        });
    }
}

export { LootsheetNPC5eHooks };
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

            const triggeringActor = game.actors.get(data.triggerActorId),
                npcActorToken = canvas.tokens.get(data.tokenId),
                action = data.type;

            console.log(MODULE.ns + " | Hooks | socketListener | data", data);

            if (!action || action === "error") {
                ui.notifications.error(MODULE.ns + " | socketListener | InvalidData");
                console.log("Loot Sheet | Transaction Error: ", data);
                return;
            }

            if (!triggeringActor) {
                ui.notifications.error(MODULE.ns + " | socketListener | Exception | Could not get acting player.");
                return;
            }

            if (!npcActorToken) {
                ItemHelper.errorMessageToActor(triggeringActor, "GM not available, the GM must on the same scene to purchase an item.")
                ui.notifications.error(MODULE.ns + " | Player attempted to trigger `" + action + "` on a different scene.");
                return;
            }

            if (game.user.isGM && data.processorId === game.user.id) {
                if (action === "buyItem") {
                    ItemHelper.transaction(npcActorToken.actor, triggeringActor, data.targetItemId, data.quantity);
                }
                if (action === "lootAll") {
                    ItemHelper.lootItems(npcActorToken.actor, triggeringActor, data.items);
                }
                if (action === "lootItem") {
                    ItemHelper.lootItems(npcActorToken.actor, triggeringActor, [{id: data.targetItemId, quantity: data.quantity}]);
                }
                if (action === "distributeCoins") {
                    ItemHelper.distributeCoins(npcActorToken.actor);
                }
                if (action === "lootCoins") {
                    ItemHelper.lootCoins(npcActorToken.actor, triggeringActor);
                }
            }
        });
    }
}

export { LootsheetNPC5eHooks };
import { MODULE } from '../data/config.js';
import { ItemHelper } from '../helper/ItemHelper.js';
import { SheetSettings } from '../classes/settings/sheetSettings.js';
import { PopulatorSettings } from '../classes/settings/populatorSettings.js';
import VersionCheck from '../helper/versionCheckHelper.js';
import renderWelcomeScreen from '../apps/welcomeScreen.js';
import { API } from '../API.js';
import { tokenHelper } from '../helper/tokenHelper.js';

/**
 * @module LootSheetNPC5e.hooks
 *
 * @description
 * Handles the following:
 * - initializing the module API
 * - registering the module settings
 * - initializing the modules socketListeners that handles incoming  player interaction requests
 * -
 *
 */
class LootsheetNPC5eHooks {
    /**
     * Hooks on game hooks and attaches methods
     */
    static init() {
        Hooks.once("init", LootsheetNPC5eHooks.foundryInit);
        Hooks.once("ready", LootsheetNPC5eHooks.foundryReady);
        Hooks.once('devModeReady', LootsheetNPC5eHooks.onDevModeReady);
        Hooks.once('setup', LootsheetNPC5eHooks.foundrySetup);
        Hooks.on('createToken', LootsheetNPC5eHooks.onCreateToken);
    }

    static foundrySetup() {
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

    static foundryInit() {
        SheetSettings.registerSettings();
        PopulatorSettings.registerSettings();
        LootsheetNPC5eHooks.socketListener();
    }

    static foundryReady() {
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

        if (game.user.isGM && VersionCheck.check(MODULE.ns)) {
            renderWelcomeScreen();
        }

        LootsheetNPC5eHooks._activateListeners();
    }

    /**
     * Activate module eventListeners
     */
    static _activateListeners(app = document) {

        //listen on document link clicks in loot sheet chat messages
        const chatMsgLink = app.querySelectorAll('#chat .lsnpc-document-link');

        chatMsgLink.forEach(async el => {
            el.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!e.target.dataset.uuid) return;
                const doc = await fromUuid(e.target.dataset.uuid);
                if (!doc) return;
                await doc.sheet.render(true);
                e.stopPropagation();
            });
        });
    }

    static socketListener() {
        game.socket.on(MODULE.socket, data => {

            const triggeringActor = game.actors.get(data.triggerActorId),
                npcActorToken = canvas.tokens.get(data.tokenId),
                action = data.type;

            console.log(MODULE.ns + " | Hooks | socketListener | data", data);

            if (!action || action === "error") {
                const msg = data.message || " | socketListener | InvalidData ";
                ui.notifications.error(MODULE.ns + ' | ' + msg);
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
                    const items = ItemHelper.getLootableItems(npcActorToken.actor.items).map((item) => ({
                        id: item.id,
                        data: {
                            data: {
                                quantity: item.data.data.quantity
                            }
                        }
                    }));

                    ItemHelper.lootItems(npcActorToken, triggeringActor, items);
                }
                if (action === "lootItem") {
                    let items = [{ id: data.targetItemId, data: { data: { quantity: data.quantity } } }];
                    ItemHelper.lootItems(npcActorToken, triggeringActor, items);
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

    static async onCreateToken(token, createData, options, userId) {
        const useSkiplist = game.settings.get(MODULE.ns, MODULE.settings.keys.populator.useSkiplist),
            skipThisType = game.settings.get(MODULE.ns, "skiplist_" + creatureType);
        // only act on tokens dropped by the GM
        if (!game.user.isGM) return token;
        if (!game.settings.get(MODULE.ns, "autoPopulateTokens")) return token;
        // ignore linked tokens
        if (!token.actor || token.data.actorLink) return token;
        // skip if monster's creaturType is on the skiplist
        let creatureType = token.actor.data.data.details.type.value;
        if (useSkiplist && skipThisType) return token;

        await tokenHelper.populate(token);
    }

    static onDevModeReady({ registerPackageDebugFlag }) {
        registerPackageDebugFlag(MODULE.ns);
    }
}

export { LootsheetNPC5eHooks };
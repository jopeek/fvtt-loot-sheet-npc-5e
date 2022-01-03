import { MODULE } from '../data/moduleConstants.js';
import { ItemHelper } from '../helper/ItemHelper.js';
import { SheetSettings } from '../settings/sheetSettings.js';
import { PopulatorSettings } from '../settings/populatorSettings.js';
import { VersionCheck } from '../helper/versionCheckHelper.js';
import { renderWelcomeScreen } from '../apps/welcomeScreen.js';
import { API } from '../api/API.js';

import { LootPopulator } from '../classes/LootPopulator.js';

/**
 * @module LootSheetNPC5e.hooks
 *
 * @description
 * Handles the following:
 * - initializing the module API
 * - registering the module settings
 * - initializing the modules socketListeners that handles incoming  player interaction requests
 * - listens to token creation to populate the token with loot (if conditions are met)
 *
 */
export class LootsheetNPC5eHooks {
    /**
     * Hooks on game hooks and attaches methods
     */
    static init() {
        Hooks.once("init", this.foundryInit);
        Hooks.once("ready", this.foundryReady);
        Hooks.once('devModeReady', this.onDevModeReady);
        Hooks.once('setup', this.foundrySetup);
        Hooks.on('createToken', this.onCreateToken);
        Hooks.on('getSceneControlButtons', this.attachSceneControlButtons);
        Hooks.on('renderTokenHUD', this.attachTokenHudButtons);
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
        LootsheetNPC5eHooks.socketListener();
    }

    static foundryReady() {
        PopulatorSettings.registerSettings();

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

        Handlebars.registerHelper ('truncate', function (str, len) {
            if (str.length > len && str.length > 0) {
                var new_str = str + " ";
                new_str = str.substr (0, len);
                new_str = str.substr (0, new_str.lastIndexOf(" "));
                new_str = (new_str.length > 0) ? new_str : str.substr (0, len);

                return new Handlebars.SafeString ( new_str +'...' );
            }
            return str;
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
        const useSkiplist = game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.useSkiplist);

        // only act on tokens dropped by the GM
        if (!game.user.isGM) return token;
        if (!game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.autoPopulateTokens)) return token;
        // ignore linked tokens
        if (!token.actor || token.data.actorLink) return token;
        // skip if monster's creaturType is on the skiplist
        let creatureType = token.actor.data.data.details.type.value,
            skipThisType = game.settings.get(MODULE.ns, "skiplist_" + creatureType);
        if (useSkiplist && skipThisType) return token;

        await LootPopulator.populate(token);
    }

    static attachSceneControlButtons(buttons){
        let tokenButton = buttons.find(b => b.name == "token");
        if (tokenButton) {
            tokenButton.tools.push({
                name: "lsnpc5e-populate-loot",
                title: "LSNPC | Generate Loot",
                icon: "fas fa-gem",
                visible: game.user.isGm,
                onClick: async () => await LootPopulator.populate(),
                button: true
            });
        }
    }

    static attachTokenHudButtons(hud) {
        const token = hud.object.document;

        // only for players
        // if ((game.user.role > 1 && game.user.role <= 3) || game.user.isGM) return;
        if(!token.actor) return;
        if(!token.actor.isToken) return;
        // only for unlinked Tokens
        if(token.actorLink) return;

        const HUD_left = document.querySelector('#token-hud .left');
        let lsnNav = document.createElement('nav'),
            lsnLootAllButton = document.createElement('div'),
            lsnGMButtonMakeObservable = document.createElement('div'),
            lsnLootAllImg = document.createElement('img'),
            lsnMakeObservableImg = document.createElement('img');

            lsnNav.classList.add('lsnpc5e-nav');

            // LootAll Button
            lsnLootAllButton.classList.add('lsnpc5e-hud-loot-all', 'control-icon');
            lsnLootAllButton.dataset.action = "lootAll";
            lsnLootAllButton.title = game.i18n.localize("LootSheetNPC5e.lootAll");

            lsnLootAllImg.src = "icons/svg/item-bag.svg";
            lsnLootAllImg.alt = game.i18n.localize("LootSheetNPC5e.lootAll");

            lsnLootAllButton.appendChild(lsnLootAllImg);
            lsnNav.appendChild(lsnLootAllButton);

            // GM Stuff
            //makeObservable Button
            if(game.user.isGM){
                lsnGMButtonMakeObservable.classList.add('lsnpc5e-hud-make-observable', 'control-icon');
                lsnGMButtonMakeObservable.dataset.action = "makeObservable";
                lsnGMButtonMakeObservable.addEventListener('click', async (e) => {
                    if(game.user.isGM){
                        const API = game.modules.get("lootsheetnpc5e").public.API;
                        await API.makeObservable(token);
                    }
                });

                lsnMakeObservableImg.src = "icons/svg/eye.svg";
                lsnMakeObservableImg.alt = game.i18n.localize("LootSheetNPC5e.lootAll");
                lsnGMButtonMakeObservable.appendChild(lsnMakeObservableImg);

                lsnNav.appendChild(lsnGMButtonMakeObservable);
            }

        if(HUD_left){
            HUD_left.appendChild(lsnNav);
        }
    }

    static onDevModeReady({ registerPackageDebugFlag }) {
        registerPackageDebugFlag(MODULE.ns);
    }
}
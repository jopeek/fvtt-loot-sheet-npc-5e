import { MODULE } from '../data/moduleConstants.js';
import { LootSheetSettings } from '../apps/settings/LootSheetSettings.js';
import { PopulatorSettings } from '../apps/settings/LootSeederSettings.js';
import { VersionCheck } from '../helper/VersionCheckHelper.js';
import { renderWelcomeScreen } from '../apps/WelcomeScreen.js';
import { API } from '../api/API.js';

import { LootSeeder } from '../classes/LootSeeder.js';
import { SocketListener } from './SocketListener.js';
import { HandlebarsHelper } from '../helper/HandlebarsHelper.js';

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
        Hooks.once('aipSetup', this.onAIPSetup);
        Hooks.on('createToken', this.onCreateToken);
        Hooks.on('getSceneControlButtons', this.attachSceneControlButtons);
        Hooks.on('renderTokenHUD', this.attachTokenHudButtons);
        Hooks.on("renderChatMessage", (_, jq) => this.refreshChatListeners(jq[0]));
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
        LootSheetSettings.registerSettings();

        game.socket.on(MODULE.socket, SocketListener.handleRequest);
    }

    static foundryReady() {
        PopulatorSettings.registerSettings();

        HandlebarsHelper.register();

        if (game.user.isGM && VersionCheck.check(MODULE.ns)) {
            renderWelcomeScreen();
        }

        LootsheetNPC5eHooks.refreshChatListeners();
    }

    /**
     * Activate module eventListeners
     */
    static refreshChatListeners(dom) {
        dom = dom ?? document.getElementById("chat");
        //listen on document link clicks in loot sheet chat messages
        const chatMsgLink = dom.querySelectorAll('.lsnpc-document-link');

        chatMsgLink.forEach(async el => {
            el.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!e.currentTarget.dataset.uuid) return;
                const doc = await fromUuid(e.currentTarget.dataset.uuid);
                if (!doc) return;
                if(doc.collectionName == 'tokens') {
                    await doc.actor.sheet.render(true);
                } else {
                    await doc.sheet.render(true);
                }
                e.stopPropagation();
            });
        });
    }

    /**
       * Register with AIP
       */
    static async onAIPSetup() {
        const api = game.modules.get("autocomplete-inline-properties").API;
        const DATA_MODE = api.CONST.DATA_MODE;

        // AIP
        // Define the config for our package
        const config = {
            packageName: MODULE.ns,
            sheetClasses: [
                {
                    name: 'LootsheetNPCRuleEditor', // this _must_ be the class name of the `Application` you want it to apply to
                    fieldConfigs: [
                        {
                            selector: `.data-path-input`,
                            showButton: true,
                            allowHotkey: true,
                            dataMode: DATA_MODE.OWNING_ACTOR_DATA,
                        },
                    ]
                },
            ], //

        };

        // Add our config
        api.PACKAGE_CONFIG.push(config);
    }

    static async onCreateToken(token, createData, options, userId) {
        const useSkiplist = game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.useSkiplist);

        // only act on tokens dropped by the GM
        if (!game.user.isGM) return token;
        if (!game.settings.get(MODULE.ns, MODULE.settings.keys.lootseeder.autoSeedTokens)) return token;
        // ignore linked tokens
        if (!token.actor || token.data.actorLink) return token;
        // skip if monster's creaturType is on the skiplist
        let creatureType = token.actor.data.data.details.type.value,
            skipThisType = creatureType ? game.settings.get(MODULE.ns, "skiplist_" + creatureType) : false;
        if (useSkiplist && skipThisType) return token;

        await LootSeeder.seedItems(token);
    }

    static attachSceneControlButtons(buttons) {
        let tokenButton = buttons.find(b => b.name == "token");
        if (tokenButton) {
            tokenButton.tools.push({
                name: "lsnpc5e-populate-loot",
                title: "LSNPC | Generate Loot",
                icon: "fas fa-gem",
                visible: game.user.isGm,
                onClick: () => LootSeeder.seedItems(),
                button: true
            });
        }
    }

    static attachTokenHudButtons(hud) {
        if (!game.settings.get(MODULE.ns, MODULE.settings.keys.common.addInterfaceButtons)) return;

        const token = hud.object.document;
        if (!token.actor) return;
        if (!token.actor.isToken) return;
        // only for unlinked Tokens
        if (token.actorLink) return;


        const HUD_left = document.querySelector('#token-hud .left');
        let lsnNav = document.createElement('nav'),
            lsnLootAllButton = document.createElement('div'),
            lsnGMButtonMakeObservable = document.createElement('div'),
            lsnLootAllImg = document.createElement('img'),
            lsnMakeObservableImg = document.createElement('img');

        lsnNav.classList.add('lsnpc5e-nav');

        if (game.user.isGM) {
            lsnGMButtonMakeObservable.classList.add('lsnpc5e-hud-make-observable', 'control-icon');
            lsnGMButtonMakeObservable.dataset.action = "makeObservable";
            lsnGMButtonMakeObservable.addEventListener('click', async (e) => {
                if (game.user.isGM) {
                    const API = game.modules.get("lootsheetnpc5e").public.API;
                    await API.makeObservable();
                }
            });

            lsnMakeObservableImg.src = "icons/svg/eye.svg";
            lsnMakeObservableImg.alt = game.i18n.localize("LootSheetNPC5e.lootAll");
            lsnGMButtonMakeObservable.appendChild(lsnMakeObservableImg);

            lsnNav.appendChild(lsnGMButtonMakeObservable);
        }

        if (HUD_left) {
            HUD_left.appendChild(lsnNav);
        }
    }

    static onDevModeReady({ registerPackageDebugFlag }) {
        registerPackageDebugFlag(MODULE.ns);
    }
}
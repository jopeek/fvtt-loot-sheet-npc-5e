import { MODULE } from '../data/moduleConstants.js';
import { SheetSettings } from '../apps/settings/sheetSettings.js';
import { PopulatorSettings } from '../apps/settings/populatorSettings.js';
import { VersionCheck } from '../helper/versionCheckHelper.js';
import { renderWelcomeScreen } from '../apps/welcomeScreen.js';
import { API } from '../api/API.js';

import { LootPopulator } from '../classes/LootPopulator.js';
import { socketListener } from './socketListener.js';

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
        //await LootsheetNPC5eHooks.socketListener();
        game.socket.on(MODULE.socket, socketListener.handleRequest);
    }

    static foundryReady() {
        PopulatorSettings.registerSettings();

        Handlebars.registerHelper('ifeq', function (a, b, options) {
            return (a == b) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('uneq', function (arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('hexToRGB', function (hex, alpha) {
            let r = parseInt(hex.slice(1, 3), 16),
                g = parseInt(hex.slice(3, 5), 16),
                b = parseInt(hex.slice(5, 7), 16);

            if (alpha) {
                return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
            } else {
                return 'rgb(' + r + ', ' + g + ', ' + b + ')';
            }
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

        Handlebars.registerHelper('truncate', function (str, len) {
            if (str.length > len && str.length > 0) {
                var new_str = str + " ";
                new_str = str.substr(0, len);
                new_str = str.substr(0, new_str.lastIndexOf(" "));
                new_str = (new_str.length > 0) ? new_str : str.substr(0, len);

                return new Handlebars.SafeString(new_str + '...');
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
                    name: "PopulatorSettingsConfigApp", // this _must_ be the class name of the `Application` you want it to apply to
                    fieldConfigs: [
                        {
                            selector: `.data-path-input`,
                            showButton: true,
                            allowHotkey: true,
                            dataMode: DATA_MODE.OWNING_ACTOR_DATA,
                        },
                    ]
                },
            ]
        };

        // Add our config
        api.PACKAGE_CONFIG.push(config);
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
            skipThisType = creatureType ? game.settings.get(MODULE.ns, "skiplist_" + creatureType) : false;
        if (useSkiplist && skipThisType) return token;

        await LootPopulator.populate(token);
    }

    static attachSceneControlButtons(buttons) {
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
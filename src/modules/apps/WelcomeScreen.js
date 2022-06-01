import { MODULE } from '../data/moduleConstants.js';
import { VersionCheck } from '../helper/VersionCheckHelper.js';

/**
 * Based on https://github.com/Moerill/mess
 * modified by Forien
 */
export class WelcomeScreen extends Application {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: `${MODULE.templateAppsPath}/welcomeScreen.hbs`,
      resizable: true,
      width: 450,
      height: 636,
      classes: ['lsnpc lsnpc-app welcome-screen'],
      title: game.modules.get(MODULE.ns).data.title + ' welcome screen',
    });

  }

  get template() {
    loadTemplates([
      `${MODULE.templateAppsPath}/welcomeScreen.hbs`,
      `${MODULE.templatePartialsPath}/welcomeScreen/misc.hbs`,
      `${MODULE.templatePartialsPath}/welcomeScreen/loot.hbs`,
      `${MODULE.templatePartialsPath}/welcomeScreen/merchant.hbs`,
      `${MODULE.templatePartialsPath}/welcomeScreen/seeder.hbs`,
      `${MODULE.templatePartialsPath}/welcomeScreen/patchnotes.hbs`,
    ]);

    return `${MODULE.templateAppsPath}/welcomeScreen.hbs`;
  }

  getData(options) {
    options = super.getData(options);
    options.isChecked = !VersionCheck.check(MODULE.ns);
    return options;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.show-again').on('change', event => {
      let version = '0.0.0';
      if (event.currentTarget.checked) {
        version = VersionCheck.get(MODULE.ns);
      }

      VersionCheck.set(MODULE.ns, version);
    });

    const tabs = new Tabs({ navSelector: ".tabs", contentSelector: ".content", initial: "misc", callback: () => true });
    tabs.bind(document.querySelector('.welcome-screen'));
  }
}

export function renderWelcomeScreen() {
  (new WelcomeScreen()).render(true);
}

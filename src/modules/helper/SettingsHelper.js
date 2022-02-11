export class SettingsHelper {

  /**
   *
   * @param {object} data
   */
  static getTabbedSettings(data, moduleNamespace) {
    for (let setting of game.settings.settings.values()) {
      // Only concerned about moduleNamespace settings
      if (setting?.namespace !== moduleNamespace) continue;

      // Update setting data
      const s = duplicate(setting);
      s.name = game.i18n.localize(s.name);
      s.hint = game.i18n.localize(s.hint);
      s.value = game.settings.get(s.namespace, s.key);
      s.type = setting.type instanceof Function ? setting.type.name : "String";
      s.isCheckbox = setting.type === Boolean;
      s.isSelect = s.choices !== undefined;
      s.isRange = (setting.type === Number) && s.range;

      // Classify setting
      const group = s.group;
      let groupTab = data.tabs.find(tab => tab.name === group) ?? false;
      if (groupTab) {
        groupTab.settings.push(s);
      }
    }

    return data;
  }
}
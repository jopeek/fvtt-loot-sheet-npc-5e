/**
 * Version check function from Forien Unedintified item module
 */
export class VersionCheck {
  static _reg (mN) {
    if (this._r) return

    game.settings.register(mN, 'version', {
      name: `${mN} Version`,
      default: '0.0.0',
      type: String,
      scope: 'client'
    })

    this._r = true
  }

  static check (mN) {
    if (!this._r) this._reg(mN)

    const mV = this.get(mN)
    const oV = game.settings.get(mN, 'version')

    // eslint-disable-next-line no-undef
    return isNewerVersion(mV, oV)
  }

  static set (mN, v) {
    if (!this._r) this._reg(mN)

    game.settings.set(mN, 'version', v)
  }

  static get (mN) {
    return game.modules.get(mN).data.version
  }

  static checkForUpdate (mN) {
    if(game.settings.get(mN,'autoCheckUpdates')){
      if (!this._r) this._reg(mN)

      const mV = game.modules.get(mN).data.version,
            url = game.modules.get(mN).data.manifest;

      const getJSON = function(url, callback) {
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, true);
              xhr.responseType = 'json';
              xhr.onload = function() {
                var status = xhr.status;
                if (status === 200) {
                  callback(null, xhr.response);
                } else {
                  callback(status, xhr.response);
                }
              };
              xhr.send();
          };

      //read the modules manifest form the url given in module.json
      getJSON(url, function(err, data) {
        if (err !== null) {
          console.log(mN + ' | Something went wrong: ' + err);
        }

        //check if the remote version manifest version is newer than the local version
        if (isNewerVersion(mV, data.version)) {
          ui.notifications.info(MODULE.ns + ' | ' + data.version + ' is available. Please update to the latest version.');
        }
      });

    }

    // eslint-disable-next-line no-undef
    return isNewerVersion(mV, oV)
  }
}

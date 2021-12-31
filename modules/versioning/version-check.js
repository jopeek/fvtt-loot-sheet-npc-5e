/**
 * Version check function from Forien Unedintified item module
 */
export default class VersionCheck {
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
}

/**
 * @template {new (...args: any[]) => Application} T
 * @param {T} Base
 */
export const AppSettingMixin = Base =>
    class extends Base {
        /**
         * @param {any[]} args
         */
        constructor(...args) {
            super(...args)
            this._hookHandler = Hooks.on('updateSetting', this._onUpdateSetting.bind(this))
        }

        /**
         * @abstract
         */
        _onUpdateSetting(setting, changes, options, userId) {
            throw new Error('_onUpdateSetting must be defined')
        }

        /**
         * @param {Object} [options]
         */
        async close(options) {
            Hooks.off('updateSetting', this._hookHandler)
            return super.close(options)
        }
    }
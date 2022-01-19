/**
 * @module LootsheetNPC5e.Helper.HandlebarsHelper
 *
 * @description Holds the Handlebars helper functions for the module
 *
 * @version 1.0.0
 * @since 3.4.5.3
 * @author Daniel Böttner <@DanielBoettner>
 *
 */
export class HandlebarsHelper {

    /**
     * Register Handlebars helpers
     *
     * @returns {void}
     */
    static register() {

        /**
         * If a equals b
         *
         * @param {any} a
         * @param {any} b
         * @param {any} options
         *
         * @return {Boolean}
         */
        Handlebars.registerHelper('ifeq', function (a, b, options) {
            return (a == b) ? options.fn(this) : options.inverse(this);
        });

        /**
         * @summary If a is not equal to b
         *
         * @description return true if **a** is __not__ equal to **b**
         *
         * @param {any} a
         * @param {any} b
         * @param {any} options
         *
         * @return {Boolean}
         */
        Handlebars.registerHelper('uneq', (a,b, options) => this.uneq(a, b, options));
        Handlebars.registerHelper('hexToRGB', (hex, alpha) => this.hexToRGB(hex, alpha));

        /**
         * @description Calculate the price of an item after applying the cost modifier
         *
         * @param {number} cost
         * @param {number} modifier
         *
         * @return {number}
         */
        Handlebars.registerHelper('lootsheetprice', function (basePrice, modifier = 1) {
            return (Math.round(basePrice * modifier * 100) / 100).toLocaleString('en') + " gp";
        });

        /**
         *  @description Calculate a stack weight using the weight of the item and the quantity
         *
         * @param {number} weight
         * @param {number} quantity
         *
         * @return {number}
         */
        Handlebars.registerHelper('lootsheetstackweight', function (weight, qty) {
            let showStackWeight = game.settings.get("lootsheetnpc5e", "showStackWeight");
            if (showStackWeight) {
                return `/${(weight * qty).toLocaleString('en')}`;
            }

            return "";
        });

        /**
         * @description Calculate the overall weight
         *
         * @param {number} weight
         *
         * @return {number}
         */
        Handlebars.registerHelper('lootsheetweight', function (weight) {
            return (Math.round(weight * 1e5) / 1e5).toString();
        });

        /**
         * @description Truncate a string to a given length
         *
         * @param {string} str
         * @param {number} length
         *
         * @return {string}
         */
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

        /**
         * @description Return a font size that gets smaller if the length of the string increases
         *
         * @param {string} str
         *
         * @param {number} length
         */
        Handlebars.registerHelper(
            'dynamicFontSize',
            function (str, basesize, unit) {
                str = str.toString();
                let fontSize = basesize;
                if (str.length > basesize) {
                    fontSize = basesize - (str.length - basesize);
                } else if (str.length < basesize) {
                    fontSize = basesize - str.length;
                }

                return unit == 'em' ? (fontSize / 10) + unit : fontSize + unit;
            }
        );

        /**
         * Take Numberstring and approximate it to a given number of decimal places
         * Change the suffix everytime another base of 10 is reached
         *
         */
        Handlebars.registerHelper('approximateNumber', function (number, decimals) {
            if (number === 0) return 0;

            let suffix = ["", "k", "M", "B", "T", "P", "E", "Z", "Y"];
            let base = Math.floor(Math.log10(number));
            let suffixIndex = Math.floor(base / 3);
            let suffixValue = suffix[suffixIndex];
            let value = number / Math.pow(10, suffixIndex * 3);
            return parseFloat(value.toFixed(decimals)) + suffixValue;
        });
    }

    /**
     *
     * @param {*} a
     * @param {*} b
     * @param {*} options
     * @returns
     */
    static uneq(a, b, options) {
        return (a != b) ? options.fn(this) : options.inverse(this);
    }

    /**
    * Convert a given hey string to an rgb color value
    * If an alpha is given return an rgba value instead
    *
    * @example
    * {{hexToRGB('#ff0000')}}
    * {{hexToRGB('#ff0000', 0.5)}}
    *
    * @param {string} hex
    * @param {number} alpha
    *
    * @return {string} a string for use in css
    *
    * @author Daniel Böttner <@DanielBoettner>
    */
    static hexToRGB(hex, alpha) {
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);

        if (alpha) {
            return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
        } else {
            return 'rgb(' + r + ', ' + g + ', ' + b + ')';
        }
    }
}
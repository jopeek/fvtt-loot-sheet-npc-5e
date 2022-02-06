import tippy from "tippy.js";

export class TooltipListener {

    /**
     *
     * @param {string} id
     */
    constructor(id) {
        this.id = id;
        this.app = document.querySelector(`#${this.id}`);

        return this;
    }

    get defaultOptions () {
        return {
        appendTo: "parent",
        arrow: false,
        animateFill: false,
        interactive: false,
        flipOnUpdate: false,
        placement: 'top',
        touch: ['hold', 500],
        delay: [300, 0],
        content: (instance) => { return instance.dataset.tooltipContent; },
        };
    }

    /**
     *
     * @param {NodeList} items
     */
    async itemTooltips(items, options = {}) {
        const methodDefaults = {
            theme: 'lsn-item',
            flipOnUpdate: true,
            placement: 'bottom-end',
            onShow: (instance) => this._onShowItemTooltip(instance),
        };

        tippy(items, this._getOptions(methodDefaults, options));
    }

    /**
     * @summary Attach a tooltip to all .infobox-wrapper .help
     *
     * @todo remove this. The help text should go to a template or language file.
     * The content should be placed as in @see miscTooltips()
     */
    helperTooltips(options = {}) {
        const methodDefaults = {
            theme: 'lsn-help',
            allowHTML: true,
            content: (instance) => { return instance.parentNode.querySelector('.sheet-infobox')?.innerHTML; }
        };

        tippy(
            this.app.querySelectorAll('.infobox-wrapper .help'),
            this._getOptions(methodDefaults, options)
        );
    }

    /**
     * @summary Attach a tooltip to all elements with a data attribute tooltip-content
     *
     * @version 1.0.0
     */
    miscTooltips() {
        tippy(
            this.app.querySelectorAll('.lsnpc.actor [data-tooltip-content]'),
            this._getOptions()
        );
    }

    /**
     * @summary Get the options for tippy.js
     *
     * @description
     * Get the default options for tippy.js and merge them with the overrides.
     *  - merge methodDefaults with defaultOptions
     *  - merge method options with result of the former merge
     *
     * @param {object} methodDefaults
     * @param {object} options
     *
     * @returns {object}
     */
    _getOptions(methodDefaults = {}, options = {}) {
        let defaultOptions = this.defaultOptions;
        defaultOptions = mergeObject(defaultOptions, methodDefaults);
        return mergeObject(defaultOptions, options);
    }

    /**
     *
     * @param {object} instance
     */
    async _onShowItemTooltip(instance) {
        const i = instance.reference,
            price = i.dataset.price || 0,
            weight = i.dataset.weight || '-',
            quantity = i.dataset.quantity || 1,
            rarity = i.dataset.rarity || 'common',
            container = document.createElement('aside');

        let item = await fromUuid(i.dataset.uuid);
        container.classList.add('tippy-lsnpc');
        container.classList.add(`rarity-${rarity}`);
        container.innerHTML = this._buildItemHTML(item, { price: price, weight: weight, quantity: quantity });

        instance.setContent(container);
    }

    /**
     *
     * @param {Item} item
     * @param {object} overrides
     *
     * @returns {string}
     */
    _buildItemHTML(item, overrides = {}) {
        let html = '';
        const icons = {
            armor: '<i class="ra ra-vest"></i>',
            damage: '<i class="ra ra-blaster"></i>',
            toHit: '<i class="ra ra-on-target"></i>',
            range: '<i class="ra ra-overhead"></i>',
        };
        html += `<header class="flexrow">
                    <h3 class="item-name">${item.data.name}</h3>
                    <span class="item-price">${overrides.price} 🪙 </span>
                </header>`;
        html += `<ul class="labels">`;
        for (let [k, v] of Object.entries(item.labels)) {
            if (v.length == 0) continue;
            if (typeof v !== 'string') continue;
            if (v.indexOf('undefined') >= 0) continue;
            let icon = icons[k] || '';

            html += `<li class="label">${icon}<small>${v} ${k}</small></li>`;
        }
        html += `</ul>`;

        if (item.data.data.description.value) {
            html += `<article>${item.data.data.description.value}</article>`;
        }


        html += `<footer class="flexrow">
                    <span class="item-weight"> ${overrides.weight} <i class="ra ra-kettlebell"></i></span>
                    <span class="item-quantity">📦×${overrides.quantity}</span>
                </footer>`;

        return html;
    }


}
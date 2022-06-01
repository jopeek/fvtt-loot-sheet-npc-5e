import { MODULE } from "../../data/moduleConstants.js";

/**
 * @summary Create a new instance of the PriceModifierDialog
 *
 * @param {data} options
 *
 * @returns {PriceModifierDialog}
 */
export class PriceModifierDialog extends FormApplication {
    /**
     *
     * @param {Actor} actor
     */
    constructor(data){
        super();
        this.actor = data.actor;
        this.data = {
            currentModifier: data.currentModifier,
            maxModifier: data.maxModifier
        };

        loadTemplates([
            `${MODULE.templateAppsPath}/priceModifier.hbs`
        ]);

        return this;
    }

    static get defaultOptions() {
        let classes = ["lsnpc lsnpc-dialog dialog-price-modifier styled"];

        return mergeObject(super.defaultOptions, {
            title: game.i18n.localize("Price Modifier"),
            namespace: MODULE.ns,
            template: `${MODULE.templateAppsPath}/priceModifier.hbs`,
            classes: classes,
            width: 400,
            jQuery: false,
        });
    }

    getData(){
        return {
            flags: this.actor.data.flags,
            currentModifier: this.data.currentModifier,
            maxModifier: this.data.maxModifier
        };
    }


    activateListeners(html){
        super.activateListeners(html);

        //nasty hack
        const app = document.querySelector('.lsnpc.dialog-price-modifier');
        app.classList.add(this.actor.flags.lootsheetnpc5e.sheettint.style);
        let sheetTint = Handlebars.helpers.hexToRGB(this.actor.flags.lootsheetnpc5e.sheettint.value, this.actor.flags.lootsheetnpc5e.sheettint.alpha),
            avatarTint = Handlebars.helpers.hexToRGB(this.actor.flags.lootsheetnpc5e.sheettint.value, this.actor.flags.lootsheetnpc5e.sheettint.alpha),
            blendmode = this.actor.flags.lootsheetnpc5e.sheettint.blendmode,
            styleTag = `--sheettint: ${sheetTint}; --avatartint: ${avatarTint}; --blendmode: ${blendmode};`;

        app.querySelector('header').setAttribute('style', styleTag);
        app.querySelector('form').setAttribute('style', styleTag);
        app.querySelector('#priceModifierPercent').addEventListener("change", ev => this._onChange(ev));
    }

    async _onChange(event){
        event.preventDefault();
        const app = document.querySelector('.lsnpc.dialog-price-modifier');
        app.querySelector('#priceModifierPercent').value = Math.round(event.currentTarget.value);
        app.querySelector('#priceModifierDisplay').value = Math.round(event.currentTarget.value);
        console.log(MODULE.ns + " | "+ app.querySelector('#priceModifierPercent').value / 100);
        await this.actor.setFlag(MODULE.ns, "priceModifier", app.querySelector('#priceModifierPercent').value / 100);
    }

    async _onSubmit(event){
        event.preventDefault();
        const app = document.querySelector('.lsnpc.dialog-price-modifier');
        await this.actor.setFlag(MODULE.ns, "priceModifier", app.querySelector('#priceModifierPercent').value / 100);
        super.close(event);
    }
}
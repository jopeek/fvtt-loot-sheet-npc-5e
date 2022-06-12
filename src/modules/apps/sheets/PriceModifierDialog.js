import { MODULE } from "../../data/moduleConstants.js";
import { TooltipListener } from "../../hooks/TooltipListener.js";

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
        console.log(MODULE.ns, ' getData: ', this.actor.data.flags.lootsheetnpc5e.priceModifier);
        return {
            flags: this.actor.data.flags,
            currentModifier: this.data.currentModifier,
            maxModifier: this.data.maxModifier
        };
    }


    activateListeners(html){
        super.activateListeners(html);

        let tooltipListener = new TooltipListener(this.id);
        tooltipListener.formInputTooltips();

        //nasty hack
        const app = document.querySelector('.lsnpc.dialog-price-modifier');
        console.info(MODULE.ns, ' flags?: ', this.actor.data.flags);
        app.classList.add(this.actor.getFlag(MODULE.ns, 'sheettint').style);
        let sheetTint = Handlebars.helpers.hexToRGB(this.actor.getFlag(MODULE.ns, 'sheettint').value, this.actor.getFlag(MODULE.ns, 'sheettint').alpha),
            avatarTint = Handlebars.helpers.hexToRGB(this.actor.getFlag(MODULE.ns, 'avatartint').value, this.actor.getFlag(MODULE.ns, 'avatartint').alpha),
            blendmode = this.actor.getFlag(MODULE.ns, 'sheettint').blendmode,
            styleTag = `--sheettint: ${sheetTint}; --avatartint: ${avatarTint}; --blendmode: ${blendmode};`;

        app.querySelector('header').setAttribute('style', styleTag);
        app.querySelector('form').setAttribute('style', styleTag);

        app.querySelectorAll('main section input').forEach(
            (input) => { input.addEventListener('change', this._onChange.bind(this));}
        );  
    }

    /**
     * 
     * @param {Event} event 
     */
    async _onChange(event){
        //console.info('onchange: ', this.actor.data.flags);
        event.preventDefault();
        event.stopPropagation();
        
        const app = document.querySelector('.lsnpc.dialog-price-modifier'),
            parentSection = event.currentTarget.closest('section'),
            sibling = parentSection.querySelectorAll('input'),
            value = event.currentTarget.value,
            type = parentSection.dataset.modifierType,
            flag = "priceModifier." + type;
        
        sibling.forEach(s => s.value = event.currentTarget.value);

        await this.actor.setFlag(MODULE.ns, flag, value);
    }

    async _onSubmit(event){
        event.preventDefault();
        //const app = document.querySelector('.lsnpc.dialog-price-modifier');
        //await this.actor.setFlag(MODULE.ns, "priceModifier", app.querySelector('#priceModifierPercent').value / 100);
        super.close(event);
    }
}
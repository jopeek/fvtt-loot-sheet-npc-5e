import { MODULE } from "../../data/moduleConstants.js";
import { TableHelper } from "../../helper/tableHelper.js";

class LootsheetNPCRuleEditor extends FormApplication {

    /**
     *
     * @param {string} existingRuleId
     * @param {object} options
     * @returns
     */
    constructor(existingRuleId = null, options = {}) {
        super();
        this.app = null;
        this.existingRule = existingRuleId ? {id: existingRuleId} : null;

        loadTemplates([
            `${MODULE.templateAppsPath}/ruleEditor.hbs`,
            `${MODULE.templatePartialsPath}/settings/dropdown_options.hbs`,
            `${MODULE.templatePartialsPath}/settings/filters.hbs`,
            `${MODULE.templatePartialsPath}/settings/tabContent.hbs`,
            `${MODULE.templatePartialsPath}/settings/menu.hbs`,
        ]);

        return this;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: game.i18n.localize("LootsheetNPC5e Rule Editor"),
            id: MODULE.appIds.ruleEditor,
            template: `${MODULE.templateAppsPath}/ruleEditor.hbs`,
            width: 650,
            classes: ["lsnpc-app", "rule-editor"],
            height: "auto",

            tabs: [
                { navSelector: ".tabs", contentSelector: ".content", initial: "general" }
            ]
        });
    }

    async activateListeners(html) {
        if (!this.app) {
            this.app = document.getElementById(MODULE.appIds.ruleEditor);
        }

        this.onActionClick(this.app);
        super.activateListeners(html);
        html.find('button[name="reset"]').click(this._onResetDefaults.bind(this));
    }

    async onActionClick(app = this.app) {
        app.querySelectorAll('.actions button').forEach(async el => {
            el.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!e.target.dataset.action) return ui.notifications.error("The button itself has no action in its dataset to call.");
                this._runAction(e);
            });
        });
    }

    async getData() {
        const data = super.getData();

        data.namespace = MODULE.ns;
        data.key = MODULE.settings.keys.lootpopulator.rulesets;
        data.data = await TableHelper.getGameWorldRolltables();
        data.edit = true;

        return data;
    }

    /** @override */
    async _updateObject(event, formData) {
        event.preventDefault();

        formData = await this._saveFilterRule(event, expandObject(formData)[MODULE.ns]);

        for (let [k, v] of Object.entries(formData)) {
            await game.settings.set(MODULE.ns, k, v);
        }
    }

    /**
     *
     * @param {Event} event
     * @param {object} formData
     * @param {object} options
     *
     */
    async _saveFilterRule(event, formData, options = {}) {
        // use the filterrules propery of formData to save the rules

        if (formData?.rulesets) {
            let filterRule = formData?.rulesets,
                currentRules = game.settings.get(MODULE.ns, MODULE.settings.keys.lootpopulator.rulesets),
                ruleObject = {};
            const filterRuleKey = `${filterRule.name}_${randomID(filterRule.name.length)}`;

            filterRule.rolltableName = event.currentTarget.querySelector(`select[name="${MODULE.ns}.${MODULE.settings.keys.lootpopulator.rulesets}.rolltable"] option:checked`).dataset.label;
            ruleObject[filterRuleKey] = filterRule;

            await game.settings.set(MODULE.ns, target, Object.assign(currentRules, ruleObject));
            delete formData.rulesets;
        }

        return formData;
    }


    /**
     * Add a new row in a fieldsets main
     */
    async _addRow(event, options = {}) {
        const fieldset = event.target.closest('fieldset'),
            main = fieldset.querySelector('main'),
            template = options?.template || `${MODULE.templatePartialsPath}/settings/filters.hbs`,
            templateOptions = options?.templateOptions || {
                namespace: MODULE.ns,
                key: event.target.dataset.settingsKey,
                index: fieldset.querySelectorAll('.form-group').length
            },
            ele = await renderTemplate(template, templateOptions);

        main.insertAdjacentHTML('beforeend', ele);
        //get the newly added row and activate the listeners
        const deleteButton = [...main.querySelectorAll('button[data-action="delete"]')].pop();

        deleteButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!e.target.dataset.action) return ui.notifications.error("No action found for the provided key");
            this._runAction(e);
        });

        //get AIP API and reregister
        if (game.modules.get("autocomplete-inline-properties").active) {
            const { refreshPackageConfig } = game.modules.get("autocomplete-inline-properties").API;
            refreshPackageConfig(this);
        }

    }

    async _deleteRow(event) {
        const row = event.currentTarget.closest('.form-group'),
            confirm = await Dialog.confirm({
                title: game.i18n.localize("Delete row?"),
                content: "<p>Are you sure you want to delete this row?</p>",
                defaultYes: false
            });

        if (!confirm) return;

        row.remove();
    }

    /**
   * Validate and run a requested UI action
   *
   * @param {Event} event
   * @param {HTML} app
   *
   */
    async _runAction(event) {
        switch (event.target.dataset.action) {
            case 'add':
                this._addRow(event);
                break;
            case 'delete':
                this._deleteRow(event);
                break;
        }
    }

    /**
     * Handle button click to reset default settings
     * @param event {Event}   The initial button click event
     * @private
     */
    _onResetDefaults(event) {
        event.preventDefault();
        const resetOptions = event.currentTarget.form.querySelectorAll('.tab.active .settings-list [data-default]');
        for (let input of resetOptions) {
            if (input && input.type === "checkbox") input.checked = input.dataset.default;
            else if (input) input.value = input.dataset.default;
        }
    }
}

export function renderRuleEditor(options) {
    const ruleEditor = new LootsheetNPCRuleEditor(options);
    ruleEditor.render(true);
}
import { MODULE } from '../data/moduleConstants.js';
import { utils } from "../helper/utils.js";

export class TableRoller {

	constructor(table) {
		this.table = table;
		this.rollOptionDefault = { total: 1, itemQtyFormula: 1, itemQtyLimit: 0, currencyFormula: 0 };
		return this;
	}

	/**
	 *
	 * @param {number|string} rollOptions
	 *
	 * @returns {array} results
	 */
	async roll(rollOptions = undefined) {
		rollOptions = rollOptions || this.rollOptionDefault ;
		this.results = await this.rollManyOnTable(rollOptions , this.table);
		return this.results;
	}

	getCurrencyData() {
		return this.currencyData;
	}

	/**
	 *  Recursively draw from a rolltable for n amount of times.
	 *  Collect the results in an array.
	 *
	 *	@param {RollTable} table
	 *	@param {number} rollOptions
	 *	@param {object} options
	 *	@returns {array}
	 */
	async rollManyOnTable(rollOptions, table, { _depth = 0 } = {}) {
		const maxRecursions = 5;

		let amountToRoll = rollOptions?.total || 1;

		// Prevent infinite recursion
		if (_depth > maxRecursions) {
			let msg = `maxRecursions: ${maxRecursions} reached with table ${table.id}`;
			throw new Error(MODULE.ns + " | " + msg);
		}

		let drawnResults = [];

		while (amountToRoll > 0) {
			let resultToDraw = amountToRoll;
			/** if we draw without replacement we need to reset the table once all entries are drawn */
			if (!table.data.replacement) {
				const resultsLeft = table.data.results.reduce(function (n, r) { return n + (!r.drawn) }, 0)

				if (resultsLeft === 0) {
					await table.reset();
					continue;
				}

				resultToDraw = Math.min(resultsLeft, amountToRoll);
			}

			if (!table.data.formula) {
				console.log(MODULE.ns + ` | tableRoller | Error: No Forumla found for table: ${table.name}`);
				return;
			}

			const draw = await table.drawMany(resultToDraw, { displayChat: false, recursive: false });
			if (!this.mainRoll) {
				this.mainRoll = draw.roll;
			}

			for (const entry of draw.results) {
				const formulaAmount = getProperty(entry, `data.flags.better-tables.brt-result-formula.formula`) || "1";
				const entryAmount = await this.tryRoll(formulaAmount);

				let innerTable;
				if (entry.data.type === CONST.TABLE_RESULT_TYPES.ENTITY && entry.data.collection === 'RollTable') {
					innerTable = game.tables.get(entry.data.resultId);
				} else if (entry.data.type === CONST.TABLE_RESULT_TYPES.COMPENDIUM) {
					const entityInCompendium = await utils.findInCompendiumByName(entry.data.collection, 'RollTable');

					if ((entityInCompendium !== undefined) && entityInCompendium.documentName === 'RollTable') {
						innerTable = entityInCompendium;
					}
				}

				if (innerTable) {
					const innerResults = await this.rollManyOnTable(entryAmount, innerTable, { _depth: _depth + 1 });
					drawnResults = drawnResults.concat(innerResults);
				} else {
					for (let i = 0; i < entryAmount; i++) {
						debugger;
						drawnResults.push(entry);
					}
				}
			}
			amountToRoll -= resultToDraw;
		}

		return drawnResults;
	}


	/**
	 *
	 * @param {string} rollFormula
	 * @returns
	 */
	async tryRoll(rollFormula) {
		try {
			return (await (new Roll(rollFormula)).roll({ async: true })).total || 1;
		} catch (error) {
			console.error(MODULE.ns + ' | tableRoller :', error);
			return 1;
		}
	}

	/**
	 *
	 * @param {string} compendiumName
	 * @param {string} entityName
	 *
	 * @returns {Item}
	 */
	static async findInCompendiumByName(compendiumName, entityName) {
		const compendium = game.packs.get(compendiumName)
		if (compendium) {
			const entry = compendium.index.getName(entityName)
			if (entry) {
				return await compendium.getDocument(entry._id)
			}
		} else {
			switch (compendiumName) {
				case 'RollTable': return game.tables.getName(entityName)
				case 'Actor': return game.actors.getName(entityName)
				case 'Item': return game.items.getName(entityName)
				case 'JournalEntry': return game.journal.getName(entityName)
				case 'Playlist': return game.playlists.getName(entityName)
				case 'Scene': return game.scenes.getName(entityName)
				case 'Macro': return game.macros.getName(entityName)
			}
		}
	}
}
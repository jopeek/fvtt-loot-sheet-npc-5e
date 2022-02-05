import { MODULE } from '../data/moduleConstants.js';
import { Utils } from "../helper/Utils.js";

export class TableRoller {

	constructor(table) {
		this.table = table;
		this.rollOptionDefault = { total: 1, itemQtyFormula: 1, itemQtyLimit: 0, currencyFormula: 0 };
		return this;
	}

	/**
	 *
	 * @param {number|string} options
	 *
	 * @returns {Array} results
	 */
	async roll(options = false) {
		options = options || this.rollOptionDefault;
		this.results = await this.rollManyOnTable(options, this.table);
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
	 *	@param {object} rollOptions
	 *	@param {object} options
	 *	@returns {Array}
	 */

	async rollManyOnTable(rollOptions, table, { _depth = 0 } = {}) {
		const maxRecursions = 5;

		let amountToRoll = rollOptions?.total || 1;
		let drawnResults = [];

		// Prevent infinite recursion
		if (_depth > maxRecursions) {
			let msg = `maxRecursions:  reached with table ${table.id}`;
			throw new Error(MODULE.ns + " | " + msg);
		}

		if (!table.data.formula) return console.log(MODULE.ns + ` | tableRoller | Error: No Forumla found for table: ${table.name}`);

		while (amountToRoll > 0) {
			const resultsLeft = await this.checkResultsLeft(table, amountToRoll);
			if (!resultsLeft) continue;

			const resultToDraw = Math.min(resultsLeft, amountToRoll),
				drawResult = await table.drawMany(resultToDraw, { displayChat: false, recursive: false });

			drawnResults = await this._updateDrawnResults(drawResult, drawnResults, _depth, rollOptions)
			amountToRoll -= resultToDraw;
		}

		return drawnResults;
	}

	/**
	 *
	 * @param {Array} drawnResults
	 * @param {number} depth
	 * @param {object} options
	 *
	 * @returns {Array} drawnResults
	 */
	async _updateDrawnResults(drawResult, drawnResults, depth, options) {
		for (const result of drawResult.results) {
			const quantityFormula = options.customRoll.itemQtyFormula || "1",
				resultQuantity = await this.tryRoll(quantityFormula),
				innerTable = this._getInnerTable(result);

			if (innerTable) {
				options.total = resultQuantity;
				const innerResults = await this.rollManyOnTable(options, innerTable, { _depth: depth + 1 });
				drawnResults = drawnResults.concat(innerResults);
			} else {
				for (let i = 0; i < resultQuantity; i++) {
					drawnResults.push(result);
				}
			}
		}

		return drawnResults;
	}

	/**
	 *
	 * @param {*} result
	 * @returns
	 */
	_getInnerTable(result) {
		const returnByType = {
			[CONST.TABLE_RESULT_TYPES.DOCUMENT]: this._handleDocumentResult,
			[CONST.TABLE_RESULT_TYPES.COMPENDIUM]: this._getRollTableFromCompendium
		};

		if (Object.keys(returnByType).includes(result.data.type)) return returnByType[result.data.type](result);
	}

	_handleDocumentResult(result) {
		if (result.data.collection === 'RollTable') {
			return game.tables.get(result.data.resultId);
		}
	}

	_getRollTableFromCompendium(result) {
		const rolltableFromCompendium = Utils.findInCompendiumByName(result.data.collection, 'RollTable');

		if ((rolltableFromCompendium !== undefined) && rolltableFromCompendium.documentName === 'RollTable') {
			return rolltableFromCompendium;
		}
	}

	/**
	 *
	 * @param {RollTable} table
	 * @param {number} amountToRoll
	 *
	 * @returns {number}
	 */
	async checkResultsLeft(table, amountToRoll) {
		if (!table.data.replacement) {
			const resultsLeft = table.data.results.reduce(function (n, r) { return n + (!r.drawn) }, 0)

			if (resultsLeft === 0) {
				await table.reset();
				return false;
			}
		}

		return amountToRoll;
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
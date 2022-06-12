import { MODULE } from '../data/moduleConstants.js';

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
	async roll(options = {}) {
		options = options || this.rollOptionDefault;
		this.results = await this.rollManyOnTable(this.table, 0, options.total, options);
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
	 *	@param {number} depth
	 *	@param {number} amountToRoll
	 *	@param {object} options
	 *
	 *	@returns {Array} drawnResults
	 */
	async rollManyOnTable(table, depth = 0, amountToRoll = 1, options = {}) {
		const maxRecursions = 5;
		let drawnResults = [];

		// Prevent infinite recursion
		if (depth > maxRecursions) {
			let msg = `maxRecursions:  reached with table ${table.id}`;
			throw new Error(MODULE.ns + " | " + msg);
		}

		if (!table.data.formula) {
			table.data.formula = amountToRoll+'d'+this.table.results.size;
		}		

		while (amountToRoll > 0) {
			const resultsLeft = await this.checkResultsLeft(table, amountToRoll);
			if (!resultsLeft) continue;

			const resultToDraw = Math.min(resultsLeft, amountToRoll),
				drawResult = await table.drawMany(resultToDraw, { displayChat: false, recursive: false });

				drawnResults = await this._updateDrawnResults(drawResult, drawnResults, depth, options);
				amountToRoll -= resultToDraw;
		}
		
		return drawnResults;
	}

	/**
	 *
	 * @param {Array} drawResult
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
				innerTable = await this._getInnerTableOrFalse(result);

			if (innerTable) {
				options.total = resultQuantity;
				let innerdepth = depth + 1;
				const innerResults = await this.rollManyOnTable(innerTable, innerdepth, 1, options);
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
	 * @summary Get the inner table or false if not found
	 *
	 * @param {TableResult} result
	 *
	 * @returns {Promise<RollTable|false>}
	 */
	async _getInnerTableOrFalse(result) {
		let rolltable = false;

		if(result.data.type === CONST.TABLE_RESULT_TYPES.DOCUMENT){
			rolltable = this._getRolltableFromGameWorld(result);
		} else if (result.data.type === CONST.TABLE_RESULT_TYPES.COMPENDIUM) {
			rolltable = await this._getRollTableFromCompendium(result);
		}

		return rolltable;
	}

	/**
	 *
	 * @param {TableResult} result
	 *
	 * @returns {Promise<RollTable|false>} rolltable
	 */
	_getRolltableFromGameWorld(result) {
		if (result.data.collection === 'RollTable') {
			return game.tables.get(result.data.resultId);
		}
		return false;
	}

	/**
	 *
	 * @param {TableResult} result
	 *
	 * @returns {Promise<RollTable>|false} rolltable
	 */
	async _getRollTableFromCompendium(result) {
		let uuidString = `Compendium.${result.data.collection}.${result.data.resultId}`,
		rolltable = await fromUuid(uuidString);

		if (!rolltable) {
			console.error(MODULE.ns + ' | tableRoller :', `Could not find document with uuid: ${uuidString}`);
			return false;
		}

		if(rolltable.documentName === 'RollTable') return rolltable;
		return false;
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
}
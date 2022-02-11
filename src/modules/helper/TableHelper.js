import { MODULE } from "../data/moduleConstants.js";

/**
 * @description {Rolltable} related helper functions
 *
 * @see {@link https://github.com/DanielBoettner/fvtt-loot-seeder-npc-5e/blob/master/scripts/modules/tableHelper.mjs}
 *
 * @version 1.0.1
 *
 */
export class TableHelper {

	/**
	 * @summary get all rolltables in the world and in compendium packs
	 *
	 * @returns {Array}
	 */
	static async getGameWorldRolltables() {
		const rollTablePacks = game.packs.filter((pack) => pack.documentName === "RollTable");

		let availableRolltables = {};

		if (game.tables.size > 0) availableRolltables["World"] = [];
		for (const table of game.tables) {
			availableRolltables["World"].push({
				name: table.name,
				uuid: table.uuid,
			});
		}
		for (const pack of rollTablePacks) {
			const idx = await pack.getIndex({ fields: ['name', 'data.uuid'] }),
				tableString = `Compendium.${pack.collection}.`;

			availableRolltables[pack.metadata.label] = [];

			for (let table of idx) {
				availableRolltables[pack.metadata.label].push({
					name: table.name,
					uuid: tableString + table._id,
				});
			}
		}

		return availableRolltables;
	}

	/**
	 * @param {string} rolltableReference
	 * @returns {RollTable}
	 *
	 * @version 1.0.0
	 */
	static async getRolltable(rolltableReference) {
		const [type, source, category, packReference] = rolltableReference.split('.');
		if (packReference) {
			return await game.packs.get(source + '.' + category).getDocument(packReference);
		}


		return game.tables.get(source);
	}

	/**
	 *
	 * @param {Item} item
	 * @param {string|number} index
	 *
	 * @returns {Document}
	 */
	static async _rollSubTables(item, index = 0) {
		if (item instanceof RollTable) {
			const subTableResults = await item.roll(),
				collection = subTableResults.results[index].data.collection;

			if (collection === "Item") {
				item = game.items.get(subTableResults.results[index].data.resultId);
			} else {
				let itemCollection = game.packs.get(subTableResults.results[index].data.collection);
				item = await itemCollection.getDocument(subTableResults.results[index].data.resultId);
			}

			if (item instanceof RollTable) {
				item = await TableHelper._rollSubTables(item, index);
			}
		}

		return item;
	}

	/**
		 *
		 * @param {String} creatureType
		 * @returns {String|false} a RollTable.id
		 */
	static getLinkedRolltableByCreatureType(creatureType) {
		if (!creatureType || creatureType.length === 0) return false;

		try {
			const systemCreatureTypes = Object.keys(CONFIG[game.system.id.toUpperCase()]?.creatureTypes) ?? [];
			if (systemCreatureTypes.includes(creatureType)) {
				const creatureTypeKey = `creaturetype_default_${creatureType}_table`,
					fallback = game.settings.get(MODULE.ns, creatureTypeKey);

				if (fallback && fallback != 0) return fallback;
			}
		} catch (e) {
			console.error(e);
			return false;
		}

		return false;
	}
}

export const getLinkedRolltableByCreatureType = TableHelper.getLinkedRolltableByCreatureType;

/**
 * @description {Rolltable} related helper functions
 * 
 * @see {@link https://github.com/DanielBoettner/fvtt-loot-populator-npc-5e/blob/master/scripts/modules/tableHelper.mjs}
 * 
 * @version 1.0.0
 * 
 */
 class tableHelper {

    /**
	 * @param {string} rolltableReference 
	 * @returns {RollTable}
	 * 
	 * @version 1.0.0
	 */
	static async _getRolltable(rolltableReference){
		const [type, source, category, packReference] = rolltableReference.split('.');
		if(packReference){
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
				item = await tableHelper._rollSubTables(item, index);
			}
		}

		return item;
	}
}
export default tableHelper;

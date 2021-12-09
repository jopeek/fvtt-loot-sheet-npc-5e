import { LootSheetNPC5e } from './modules/classes/LootsheetNPC5e.js';
import { LootsheetNPC5eHooks } from './modules/hooks/LootsheetNPC5eHooks.js';

//Register the loot sheet
Actors.registerSheet("dnd5e", LootSheetNPC5e, {
    types: ["npc"],
    makeDefault: false
});

/**
 * Initial Setup with settings, socket, handlebars & API
 */
LootsheetNPC5eHooks.init();


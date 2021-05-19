import populateLoot from '../scripts/populateLoot.js';

Hooks.on('ready', async () => {
    _hookPreTokenCreate();
});

function _hookPreTokenCreate() {
  Hooks.on('createToken', (scene, data, options, userId) => {
    const actor = game.actors.get(data.actorId);

    if (!actor || (data.actorLink)) // Don't for linked token
      return data;

    let populateLootHook = new populateLoot;
    populateLootHook.generateLoot(scene, data);
  });
}

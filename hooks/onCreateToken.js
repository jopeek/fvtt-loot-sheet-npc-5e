import {populateLoot} from '../scripts/populateLoot.js';

export let initHooks = () => {
    Hooks.on('createToken', (scene, data, options, userId) => {
      
      if(! game.settings.get("lootsheetnpc5e","autoPopulateTokens")) 
        return;
        
      const actor = game.actors.get(data.actorId);

      if (!actor || (data.actorLink)) // Don't for linked token
        return data;

      populateLoot.generateLoot(scene, data);
    });
}

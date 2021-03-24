export class MigrationHelper {

    static async startMigration(){
        let currentDataModelVersion = game.settings.get("lootsheetnpc5e", "data-model-version");
        if(currentDataModelVersion < 2){
            await MigrationHelper.migrateToDataModel_2();
            game.settings.set("lootsheetnpc5e", "data-model-version", 2 );
        }
    }
    static async migrateToDataModel_2(){
        ui.notifications.info("Migration to dnd model in progress");
        
        //Migrate all actors
        const allActors = [...game.actors].filter(actor =>{
            return (actor.data.flags.core || {}).sheetClass === "dnd5e.LootSheet5eNPC"
        });

        for (let currActor of allActors){
            this.migrateActor(currActor);
        }

        //Migrate tokens within each scene
        let scene_id_array = [];
        for (const scene of Scene.collection) {
            scene_id_array.push(scene.data._id);	
        }
        
        if(game.scenes.get(scene_id_array[0]) !== game.scenes.active){
            Hooks.once('canvasReady', () => MigrationHelper.migrateSceneHook(scene_id_array));
            await game.scenes.get(scene_id_array[0]).activate();
        }
        else{
            MigrationHelper.migrateSceneHook(scene_id_array);
        }
    }

    static async migrateSceneHook(remaining_scenes){
        try {				
            if(remaining_scenes.length > 0){
                if(game.scenes.get(remaining_scenes[0]) !== game.scenes.active){
                    Hooks.once('canvasReady', () => MigrationHelper.migrateSceneHook(remaining_scenes));
                    return;
                }
                else {
                    for (const token of canvas.tokens.placeables) {
                        if ((token.actor.data.flags.core || {}).sheetClass === "dnd5e.LootSheet5eNPC") {
                            MigrationHelper.migrateActor(token.actor);
                        }
                    }
                    
                    console.log("Loot Sheet | " + `Migrated ${game.scenes.active.name}` );
                    ui.notifications.info(`Migrated ${game.scenes.active.name}`);
                    remaining_scenes.shift();
                    if(remaining_scenes.length > 0){
                        Hooks.once('canvasReady', () => MigrationHelper.migrateSceneHook(remaining_scenes));
                        await game.scenes.get(remaining_scenes[0]).activate();
                        return;	
                    }
                }
            }
            console.log("Loot Sheet | " + "Migrated scene to dnd data model" );
            ui.notifications.info("Migrated scene to dnd data model");
        } catch (error) {
            console.error(error);
            ui.notifications.error(`Failed to migrate ${game.scenes.active.name}`);				
        }	
    }

    static migrateActor(currentActor) {
        let newCurrencies = {};
        const oldCurrencies = currentActor.data.data.currency;
        for (let c in currentActor.data.data.currency) {
            newCurrencies[c] = oldCurrencies[c] ? oldCurrencies[c].value : 0;
        }
        currentActor.update({ "data.currency": newCurrencies });
    }

    static isFirstActiveGM(){
        const firstGm = game.users.find((u) => u.isGM && u.active);
        if (firstGm && game.user === firstGm) {
            return true;
        }
        return false;
    }
}



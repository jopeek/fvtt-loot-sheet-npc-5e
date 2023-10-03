[![Github All Releases](https://img.shields.io/github/downloads/jopeek/fvtt-loot-sheet-npc-5e/total.svg)]() [![Donate](https://img.shields.io/badge/Donate-BuyMeACoffee-green.svg)](https://www.buymeacoffee.com/ChalkOne)
# Loot Sheet NPC 5E

This module adds an additional NPC sheet which can be used for loot containers such as chests or merchants in your game. It has a permission system that allows observers to make loot or ourchase actions which will automatically process the item transaction, including inventory moves and currency changes. 

A loot sheet allows players with the right permissions to loot items from it, while a merchant sheet lets them purchase the items in exchange for currency. Merchant sheets can also be populated via rolls from rollable tables. This allows a GM to quickly create varied inventories for their merchants. A couple of rollable tables are included and can be imported via standard rollable table methods. It is also compatible with our rollable table collections such as https://foundryvtt.com/packages/foundry_community_tables.

### History

This version was forked from Hooking's module which ended compatibility with Foundry VTT version 0.3.9 (https://gitlab.com/hooking/foundry-vtt---loot-sheet-npc). This fork should be updated by me to keep it current with Foundry VTT.

I will only maintain a DND5e compatible version of this mod, but I encourage forks for other systems as well as accept pull requests and contributions for this one. I'm very busy and appreciate all current and future contributors!

### Features

Allows for easy assembly of items and coins to be distributed to players.

More features detailed below.

##### Permissions
Permissions can be set in the sheet for each player and range from no access (cannot open sheet) to observer (view sheet and contents and utilize loot or buy buttons) to owner (view sheet and add/remove items and configure sheet).

![demo_permissions](https://thumbs.gfycat.com/CaringWildKoi-size_restricted.gif)

##### Shopkeeper Sheet
Can be used to create an inventory of a shopkeeper to allow players to peruse their inventory. Prices are listed next to each item.

![demo_inventory](https://raw.githubusercontent.com/jopeek/fvtt-loot-sheet-npc-5e/master/images/demo_inventory.jpg)

##### Price Modifier
Prices can be adjusted by percentage for all owned items.

![price_modifier](https://thumbs.gfycat.com/WelloffFortunateInganue-size_restricted.gif)

A Biography tab is also available.

![demo_biography](https://raw.githubusercontent.com/jopeek/fvtt-loot-sheet-npc-5e/master/images/demo_biography.jpg)

##### Coin Distribution
Any coins in the sheet can easily be split evenly across all players with owner access. The math and distribution is done for you via a single click if you're the GM.

![demo_splitcoins](https://thumbs.gfycat.com/ElementaryDependentGalapagosdove-size_restricted.gif)

##### Create Spell Scrolls
Dragging of spells into the sheet will automatically turn them into scrolls.

![demo_scrolls](https://thumbs.gfycat.com/LividAccurateFluke-size_restricted.gif)

### Compatibility:
- Tested with FVTT v0.7.9 and the DND5E system only.

# Installation Instructions

To install a module, follow these instructions:

1. Start FVTT and browse to the Game Modules tab in the Configuration and Setup menu
2. Select the Install Module button and enter the following URL: https://raw.githubusercontent.com/jopeek/fvtt-loot-sheet-npc-5e/master/module.json
3. Click Install and wait for installation to complete 

# Translation
If you want to contribute to the translation of this module into any language.
1. You need to add new language the module.json file like this
    
> Shortname languages can see this  **[i18n]**(https://www.w3.org/International/O-charset-lang.html)  
``` 
"languages": [{
"lang": "en",
    "name": "English",
    "path": "/lang/en.json"
},
{
    "lang": "Shortname",
    "name": "Language name",
    "path": "/lang/<sub>Shortname</sub>.json"
},
]
```
2. then in the lang\ folder copy and rename **en.json** like **it.json** 
3. Now you can make translations!)
4. Poll to github, or create issue your result, and thanks you!

## Translation completed
```
    en [**********************************************] 100%
    ru [*****-----------------------------------------] 15%
```
# Feedback

If you have any suggestions or feedback, please submit an issue on GitHub or contact me on Discord (ChalkOne#0156).

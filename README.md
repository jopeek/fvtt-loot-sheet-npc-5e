# Loot Sheet NPC 5E

This module adds an additional NPC sheet which can be used for loot containers such as chests. It also allows spells to be automatically converted into spell scrolls by dragging them onto this sheet. 

This version was forked from Hooking's module which ended compatibility with Foundry VTT version 0.3.9 (https://gitlab.com/hooking/foundry-vtt---loot-sheet-npc). This fork should be updated by me to keep it current with Foundry VTT.

### Features

Allows for easy assembly of items and coins to be distributed to players.

More features detailed below.

##### Permissions
Permissions can be set in the sheet for each player and range from no access (cannot open sheet) to observer (view sheet and contents) to owner (view sheet and add/remove items).

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
- Tested with FVTT v0.5.3.

### Known Issues:
- Dragging an item out of the sheet does not actually remove it from the sheet's inventory.
- Price Modifier currently doesn't save owned item prices properly on Tokens, so the button will not appear on tokens. Believe this to be related to a FoundryVTT issue. 
- Currently can't get back to original prices, especially if percentage is set to 0.

### Installation Instructions

To install a module, follow these instructions:

1. Start FVTT and browse to the Game Modules tab in the Configuration and Setup menu
2. Select the Install Module button and enter the following URL: https://raw.githubusercontent.com/jopeek/fvtt-loot-sheet-npc-5e/master/module.json
3. Click Install and wait for installation to complete 

### Feedback

If you have any suggestions or feedback, please contact me on Discord (ChalkOne#0156).
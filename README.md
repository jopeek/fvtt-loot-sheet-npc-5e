[![GitHub license](https://badgen.net/github/license/jopeek/fvtt-loot-sheet-npc-5e)](https://github.com/jopeek/fvtt-loot-sheet-npc-5e/blob/master/LICENSE.md)
[![GitHub branches](https://badgen.net/github/branches/jopeek/fvtt-loot-sheet-npc-5e)](https://github.com/jopeek/fvtt-loot-sheet-npc-5e/branches) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Foundry VTT](https://img.shields.io/badge/Build_4-Foundry_VTT-orange.svg)](https://foundryvtt.com)



# Loot Sheet NPC 5e #

This module adds a stylable additional character sheet for NPC actors.
_Loot Sheet NPC 5e_ can be used to create
* lootable NPC token/actor's for
    * defeated NPCs
    * treasure chests
    * ...
* merchant NPCs token/actor's.
    * allows players to trade with a merchant NPC
* party loot or token/actor's.
* more _!?_


## Features

* Buy/Sell/Loot items
    * loot item(s)
    * loot the whole inventory
    * loot or split currency
* Add loot via a rolltable and simple formulas.
    * directly in the sheet for the current sheet
    * Can be automated to automatically add loot
        * with a default rolltable
        * by creature type (or skip creatures)
        * based on filter rules
* Add currency via [...]
* Set permissions with simple clicks for all players.
    * filter players based on more options (views scene, has a token in scene)
* Styling
    * color tints for the sheet and the actor
    * a selection of different styles
    * custom background image
    * darkmode
    * styling is even used in generated chat messages

More features detailed below.

## GM Section
In the GM section of the sheet items can be added.
This allows a GM to quickly create varied inventories for their merchants. A couple of rollable tables are included and can be imported via standard rollable table methods.
It is also compatible with rollable table collections such as https://foundryvtt.com/packages/foundry_community_tables.
## Permissions
LootSheetNPC5e comes with a permission system that allows observers to interact with the sheet.

Find details in the [Wiki/Permissions](https://github.com/DanielBoettner/fvtt-loot-sheet-npc-5e/wiki/Permissions)
## Sheet types
### Loot
To allow players to loot items. From a sheet the players need *observer*
loot or ourchase actions which will automatically process the item transaction, including inventory moves and currency changes.

Permissions can be set in the sheet for each player and range from no access (cannot open sheet) to observer (view sheet and contents and utilize loot or buy buttons) to owner (view sheet and add/remove items and configure sheet).

![demo_permissions](https://thumbs.gfycat.com/CaringWildKoi-size_restricted.gif)

## Merchant /Shopkeeper Sheet
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
- Tested with FVTT v9 (Build 245) and DND5e version ^1.5.6

### Installation Instructions

To install a module, follow these instructions:

1. Start FVTT and browse to the Game Modules tab in the Configuration and Setup menu
2. Select the Install Module button and enter the following URL: https://raw.githubusercontent.com/jopeek/fvtt-loot-sheet-npc-5e/master/module.json
3. Click Install and wait for installation to complete

### History

This version was forked from Hooking's module which ended compatibility with Foundry VTT version 0.3.9 (https://gitlab.com/hooking/foundry-vtt---loot-sheet-npc).

I will only maintain a DND5e compatible version of this mod, but I encourage forks for other systems as well as accept pull requests and contributions for this one. I'm very busy and appreciate all current and future contributors!

### Feedback

* Via the [issues section](https://github.com/jopeek/fvtt-loot-sheet-npc-5e/issues)
* On the [FoundryVTT Discord](https://discord.gg/foundryvtt)
    * [![ChalkOne](https://badgen.net/badge/icon/ChalkOne?icon=discord&label)](https://discordapp.com/users/ChalkOneChalkOne#5678)
    * [![JackPrince](https://badgen.net/badge/icon/JackPrince?icon=discord&label)](https://discordapp.com/users/JackPrince#0494)

### Support the project
* ChalkOne
    * [![Donate](https://img.shields.io/badge/Donate-BuyMeACoffee-green.svg)](https://www.buymeacoffee.com/ChalkOne)
* JackPrince
    * [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/JackPrince) [![Donate](https://img.shields.io/badge/Donate-Kofi-green.svg)](ko-fi.com/danielboettner) [![Patreon](https://img.shields.io/badge/Patreon-JackPrince-blue.svg)](https://www.patreon.com/JackPrince)
----
[![Open Source? Yes!](https://badgen.net/badge/Open%20Source%20%3F/Yes%21/blue?icon=github)](https://github.com/Naereen/badges/)

[![JavaScript](https://img.shields.io/badge/--F7DF1E?logo=javascript&logoColor=000)](https://www.javascript.com/)
[![git](https://img.shields.io/badge/--F05032?logo=git&logoColor=ffffff)](http://git-scm.com/)

[![Npm](https://badgen.net/badge/icon/npm?icon=npm&label)](https://https://npmjs.com/)
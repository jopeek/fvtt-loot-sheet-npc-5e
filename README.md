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


![image](https://user-images.githubusercontent.com/21986545/153590133-23c75ab4-cbf9-4540-974b-9034e8fb3c47.png)

## Permissions
LootSheetNPC5e comes with a permission system that allows observers to interact with the sheet.

Find details in the [Wiki/Permissions](https://github.com/DanielBoettner/fvtt-loot-sheet-npc-5e/wiki/Permissions)
## Sheet types
### Loot
To allow players to loot items. From a sheet the players need *observer*
loot or ourchase actions which will automatically process the item transaction, including inventory moves and currency changes.

Permissions can be set in the sheet for each player and range from no access (cannot open sheet) to observer (view sheet and contents and utilize loot or buy buttons) to owner (view sheet and add/remove items and configure sheet).

![image](https://user-images.githubusercontent.com/21986545/153590572-ce0734bc-8ffc-4988-b253-e8c9af1b96c9.png)
![image](https://user-images.githubusercontent.com/21986545/153590618-152b8c51-9969-452a-913e-f08cddcf57e0.png)
![image](https://user-images.githubusercontent.com/21986545/153592423-c0c610eb-7440-4612-ad03-f21290ffd439.png)

## Merchant /Shopkeeper Sheet
Can be used to create an inventory of a shopkeeper to allow players to peruse their inventory. Prices are listed next to each item.

### Inventory
![image](https://user-images.githubusercontent.com/21986545/153590843-cdc4c0fc-5222-4d30-a20f-ddd0bfc110a4.png)
![image](https://user-images.githubusercontent.com/21986545/153590910-d09f10a4-382d-423f-b771-2284b3397efb.png)

### Trade Screen
![image](https://user-images.githubusercontent.com/21986545/153590732-a1086023-0c86-4e51-8fd9-91b517e74c5c.png)
![image](https://user-images.githubusercontent.com/21986545/153591076-d5dd9afc-3f74-490a-ad9b-3b3e3146998b.png)

##### Price Modifier
Prices can be adjusted by percentage for all owned items.

![image](https://user-images.githubusercontent.com/21986545/153591112-0562c6e1-1c40-4445-90bd-89b59aaa6cae.png)

A Biography tab is also available.

![image](https://user-images.githubusercontent.com/21986545/153591184-65f96687-ac47-4848-9af4-813e643ba0b4.png)

##### Coin Distribution
![image](https://user-images.githubusercontent.com/21986545/153592360-f3a49d93-e0c1-49bf-97ef-789b11be92fe.png)

##### Create Spell Scrolls
Dragging of spells into the sheet will automatically turn them into scrolls.

![demo_scrolls](https://thumbs.gfycat.com/LividAccurateFluke-size_restricted.gif)

## Seeder
### Loot generation per creature type
![image](https://user-images.githubusercontent.com/21986545/153592056-f380b4b1-d1d1-4e5d-b274-25da980ecfaa.png)

### Skiplist
![image](https://user-images.githubusercontent.com/21986545/153591315-bcf8fae6-8dbc-493c-8606-2f5d3201186c.png)

## Chat messages for interactions
![image](https://user-images.githubusercontent.com/21986545/153592298-50bd1a44-2a65-4f90-9298-c586ab97058b.png)

## Interface integration
### Make token(s) lootable (access by players)
![image](https://user-images.githubusercontent.com/21986545/153592641-a89e4c2f-385e-403c-a445-97689f730ab7.png)

### Add loot to token(s)
![image](https://user-images.githubusercontent.com/21986545/153592811-78e27692-8b6b-4f23-b518-1224f4dd59c5.png)


## Compatibility:
- Tested with FVTT v9 (Build 249) and DND5e version ^1.5.7

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

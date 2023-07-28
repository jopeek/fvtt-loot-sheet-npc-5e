class LootSheet5eNPCHelper {
  /**
   * Retrieve the loot permission for a player, given the current actor data.
   *
   * It first tries to get an entry from the actor's permissions, if none is found it uses default, otherwise returns 0.
   *
   */
  static getLootPermissionForPlayer(actorData, player) {
    let defaultPermission = actorData.ownership.default;
    if (player.playerId in actorData.ownership) {
      return actorData.ownership[player.playerId];
    } else if (typeof defaultPermission !== "undefined") {
      return defaultPermission;
    } else {
      return 0;
    }
  }

  /**
   * Handles Currency from currency.TYPE.value to currency.TYPE for backwords support
   * @param {string} folderPath - The directory to loop through
   */
  static convertCurrencyFromObject(currency) {
    Object.entries(currency).map(([key, value]) => {
      currency[key] = value?.value ?? value ?? 0;
    });
    return currency;
  }
}

class QuantityDialog extends Dialog {
  constructor(callback, options) {
    if (typeof options !== "object") {
      options = {};
    }

    let applyChanges = false;
    super({
      title: "Quantity",
      content: `
            <form>
                <div class="form-group">
                    <label>Quantity:</label>
                    <input type=number min="1" id="quantity" name="quantity" value="1">
                </div>
            </form>`,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: options.acceptLabel ? options.acceptLabel : "Accept",
          callback: () => (applyChanges = true),
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: "Cancel",
        },
      },
      default: "yes",
      close: () => {
        if (applyChanges) {
          var quantity = document.getElementById("quantity").value;

          if (isNaN(quantity)) {
            // console.log("Loot Sheet | Item quantity invalid");
            return ui.notifications.error(`Item quantity invalid.`);
          }

          callback(quantity);
        }
      },
    });
  }
}

class LootSheet5eNPC extends dnd5e.applications.actor.ActorSheet5eNPC {
  static SOCKET = "module.lootsheet-simple";

  get template() {
    // adding the #equals and #unequals handlebars helper
    Handlebars.registerHelper("equals", function (arg1, arg2, options) {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper("unequals", function (arg1, arg2, options) {
      return arg1 != arg2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper("lootsheetprice", function (basePrice, modifier) {
      return (
        (Math.round(basePrice * modifier * 100) / 100).toLocaleString("en")
      );
    });

    Handlebars.registerHelper("lootsheetstackweight", function (weight, qty) {
      let showStackWeight = game.settings.get(
        "lootsheet-simple",
        "showStackWeight"
      );
      if (showStackWeight) {
        return `/${(weight * qty).toLocaleString("en")}`;
      } else {
        return "";
      }
    });

    Handlebars.registerHelper("lootsheetweight", function (weight) {
      return (Math.round(weight * 1e5) / 1e5).toString();
    });

    const path = "systems/dnd5e/templates/actors/";
    if (!game.user.isGM && this.actor.limited)
      return path + "limited-sheet.hbs";
    return "modules/lootsheet-simple/template/npc-sheet.html";
  }

  static get defaultOptions() {
    const options = super.defaultOptions;

    mergeObject(options, {
      classes: ["dnd5e sheet actor npc npc-sheet loot-sheet-npc"],
      width: 890,
      height: 750,
    });
    return options;
  }

  async getData() {
    const sheetData = await super.getData();

    // Prepare GM Settings
    this._prepareGMSettings(sheetData.actor);

    // Prepare isGM attribute in sheet Data
    if (game.user.isGM) sheetData.isGM = true;
    else sheetData.isGM = false;

    let lootsheettype = await this.actor.getFlag(
      "lootsheet-simple",
      "lootsheettype"
    );

    if (!lootsheettype)
      await this.actor.setFlag("lootsheet-simple", "lootsheettype", "Loot");
    lootsheettype = await this.actor.getFlag(
      "lootsheet-simple",
      "lootsheettype"
    );

    let priceModifier = 1.0;
    if (lootsheettype === "Merchant") {
      priceModifier = await this.actor.getFlag(
        "lootsheet-simple",
        "priceModifier"
      );
      if (typeof priceModifier !== "number")
        await this.actor.setFlag("lootsheet-simple", "priceModifier", 1.0);
      priceModifier = await this.actor.getFlag(
        "lootsheet-simple",
        "priceModifier"
      );
    }

    let totalWeight = 0;
    this.actor.items.contents.forEach(
      (item) =>
        (totalWeight += Math.round(
          (item.system.quantity * item.system.weight * 100) / 100
        ))
    );
    if (game.settings.get("lootsheet-simple", "includeCurrencyWeight"))
      totalWeight += (
        Object.values(this.actor.system.currency).reduce(function (
          accumVariable,
          curValue
        ) {
          return accumVariable + curValue;
        },
        0) / 50
      ).toNearest(0.01);

    let totalPrice = 0;
    this.actor.items.contents.forEach(
      (item) => {
        if (item.system.price) {
          let priceInGp = item.system.price.value;
          switch(item.system.price.denomination) {
            case 'pp':
              priceInGp = item.system.price.value * 10;
              break;
            case 'ep':
              priceInGp = item.system.price.value / 5;
              break;
            case 'sp':
              priceInGp = item.system.price.value / 10;
              break;
            case 'cp':
              priceInGp = item.system.price.value / 100;
              break;
            default:
              //this is gp, no conversion
              break;
          }
          totalPrice += Math.round(
            (item.system.quantity *
              priceInGp *
              priceModifier *
              100) /
              100
          );
        }
      }
        
    );

    let totalQuantity = 0;
    this.actor.items.contents.forEach(
      (item) =>
        (totalQuantity += Math.round((item.system.quantity * 100) / 100))
    );

    let selectedRollTable = await this.actor.getFlag(
      "lootsheet-simple",
      "rolltable"
    );

    let clearInventory = await this.actor.getFlag(
      "lootsheet-simple",
      "clearInventory"
    );

    let itemQty = await this.actor.getFlag(
      "lootsheet-simple",
      "itemQty"
    );

    let itemQtyLimit = await this.actor.getFlag(
      "lootsheet-simple",
      "itemQtyLimit"
    );

    let shopQty = await this.actor.getFlag(
      "lootsheet-simple",
      "shopQty"
    );

    sheetData.lootsheettype = lootsheettype;
    sheetData.selectedRollTable = selectedRollTable;
    sheetData.itemQty = itemQty;
    sheetData.itemQtyLimit = itemQtyLimit;
    sheetData.shopQty = shopQty;
    sheetData.clearInventory = clearInventory;
    sheetData.totalItems = this.actor.items.contents.length;
    sheetData.totalWeight = totalWeight.toLocaleString("en");
    sheetData.totalPrice = totalPrice.toLocaleString("en");
    sheetData.totalQuantity = totalQuantity;
    sheetData.priceModifier = priceModifier;
    sheetData.rolltables = game.tables.contents;
    // console.log(game.tables);
    sheetData.lootCurrency = game.settings.get(
      "lootsheet-simple",
      "lootCurrency"
    );
    sheetData.lootAll = game.settings.get("lootsheet-simple", "lootAll");
    sheetData.system.currency = LootSheet5eNPCHelper.convertCurrencyFromObject(
      sheetData.system.currency
    );

    // console.log("sheetdata", sheetData);
    // console.log("this actor", this.actor);

    // Return data for rendering
    return sheetData;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
    /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);
    if (this.options.editable) {
      // Toggle Permissions
      html
        .find(".permission-proficiency")
        .click((ev) => this._onCyclePermissionProficiency(ev));
      html
        .find(".permission-proficiency-bulk")
        .click((ev) => this._onCyclePermissionProficiencyBulk(ev));

      // Price Modifier
      html.find(".price-modifier").click((ev) => this._priceModifier(ev));

      html
        .find(".merchant-settings")
        .change((ev) => this._merchantSettingChange(ev));
      html
        .find(".update-inventory")
        .click((ev) => this._merchantInventoryUpdate(ev));
    }

    // Split Coins
    html
      .find(".split-coins")
      .removeAttr("disabled")
      .click((ev) => this._distributeCoins(ev));

    // Buy Item
    html.find(".item-buy").click((ev) => this._buyItem(ev));
    html.find(".item-buyall").click((ev) => this._buyItem(ev, 1));

    // Loot Item
    html.find(".item-loot").click((ev) => this._lootItem(ev));
    html.find(".item-lootall").click((ev) => this._lootItem(ev, 1));

    // Loot Currency
    html.find(".currency-loot").click((ev) => this._lootCoins(ev));

    // Loot All
    html
      .find(".loot-all")
      .removeAttr("disabled")
      .click((ev) => this._lootAll(ev, html));

    // Sheet Type
    html.find(".sheet-type").change((ev) => this._changeSheetType(ev, html));

    // Roll Table
    //html.find('.sheet-type').change(ev => this._changeSheetType(ev, html));
  }

  /* -------------------------------------------- */

  /**
   * Handle merchant settings change
   * @private
   */
  async _merchantSettingChange(event, html) {
    event.preventDefault();
    // console.log("Loot Sheet | Merchant settings changed");

    const moduleNamespace = "lootsheet-simple";
    const expectedKeys = [
      "rolltable",
      "shopQty",
      "itemQty",
      "itemQtyLimit",
      "clearInventory",
      "itemOnlyOnce",
    ];

    let targetKey = event.target.name.split(".")[3];

    if (expectedKeys.indexOf(targetKey) === -1) {
      // console.log(`Loot Sheet | Error changing stettings for "${targetKey}".`);
      return ui.notifications.error(
        `Error changing stettings for "${targetKey}".`
      );
    }

    if (targetKey == "clearInventory" || targetKey == "itemOnlyOnce") {
      // console.log(targetKey + " set to " + event.target.checked);
      await this.actor.setFlag(
        moduleNamespace,
        targetKey,
        event.target.checked
      );
    } else if (event.target.value) {
      // console.log(targetKey + " set to " + event.target.value);
      // console.log("A");
      await this.actor.setFlag(moduleNamespace, targetKey, event.target.value);
    } else {
      // console.log(targetKey + " set to " + event.target.value);
      // console.log("B");
      await this.actor.unsetFlag(
        moduleNamespace,
        targetKey,
        event.target.value
      );
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle merchant inventory update
   * @private
   */
  async _merchantInventoryUpdate(event, html) {
    event.preventDefault();

    const moduleNamespace = "lootsheet-simple";
    const rolltableName = this.actor.getFlag(moduleNamespace, "rolltable");
    const shopQtyFormula =
      this.actor.getFlag(moduleNamespace, "shopQty") || "1";
    const itemQtyFormula =
      this.actor.getFlag(moduleNamespace, "itemQty") || "1";
    const itemQtyLimit =
      this.actor.getFlag(moduleNamespace, "itemQtyLimit") || "0";
    const clearInventory = this.actor.getFlag(
      moduleNamespace,
      "clearInventory"
    );
    const itemOnlyOnce = this.actor.getFlag(moduleNamespace, "itemOnlyOnce");
    const reducedVerbosity = game.settings.get(
      "lootsheet-simple",
      "reduceUpdateVerbosity"
    );

    let shopQtyRoll = new Roll(shopQtyFormula);

    shopQtyRoll.roll();
    // console.log("Adding ${shopQtyRoll.result} items.");
    let rolltable = game.tables.getName(rolltableName);
    if (!rolltable) {
      return ui.notifications.error(
        `No Rollable Table found with name "${rolltableName}".`
      );
    }

    if (itemOnlyOnce) {
      if (rolltable.results.length < shopQtyRoll.result) {
        return ui.notifications.error(
          `Cannot create a merchant with ${shopQtyRoll.result} unqiue entries if the rolltable only contains ${rolltable.results.length} items`
        );
      }
    }

    if (clearInventory) {
      let currentItems = this.actor.data.items.map((i) => i.id);
      await this.actor.deleteEmbeddedDocuments("Item", currentItems);
    }

    // console.log(`Loot Sheet | Adding ${shopQtyRoll.result} new items`);

    for (let i = 0; i < shopQtyRoll.result; i++) {
      const rollResult = await rolltable.roll();
      let newItem = null;
      
      if (rollResult.results[0].documentCollection === "Item") {
        newItem = game.items.get(rollResult.results[0].documentId);
      } else {
        // Try to find it in the compendium
        const items = game.packs.get(rollResult.results[0].documentCollection);
        newItem = await items.getDocument(rollResult.results[0].documentId);
      }
      if (!newItem || newItem === null) {
        return ui.notifications.error(
          `No item found "${rollResult.results[0].documentId}".`
        );
      }

      if (newItem.type === "spell") {
        newItem = await Item5e.createScrollFromSpell(newItem);
      }

      let itemQtyRoll = new Roll(itemQtyFormula);
      itemQtyRoll.roll();
      // console.log`Loot Sheet | Adding ${itemQtyRoll.result} x ${newItem.name}`);

      let existingItem = this.actor.items.find(
        (item) => item.name == newItem.name
      );

      if (existingItem === undefined) {
        // console.log(`Loot Sheet | ${newItem.name} does not exist.`);

        const createdItems = await this.actor.createEmbeddedDocuments("Item", [
          newItem.toObject(),
        ]);
        existingItem = createdItems[0];

        if (
          itemQtyLimit > 0 &&
          Number(itemQtyLimit) < Number(itemQtyRoll.result)
        ) {
          await existingItem.update({
            "data.quantity": itemQtyLimit,
          });
          if (!reducedVerbosity)
            ui.notifications.info(
              `Added new ${itemQtyLimit} x ${newItem.name}.`
            );
        } else {
          await existingItem.update({
            "data.quantity": itemQtyRoll.result,
          });
          if (!reducedVerbosity)
            ui.notifications.info(
              `Added new ${itemQtyRoll.result} x ${newItem.name}.`
            );
        }
      } else {
        // console.log(`Loot Sheet | Item ${newItem.name} exists.`, existingItem);

        let newQty =
          Number(existingItem.system.quantity) + Number(itemQtyRoll.result);
          // console.log("newqty", newQty);

        if (
          itemQtyLimit > 0 &&
          Number(itemQtyLimit) === Number(existingItem.system.quantity)
        ) {
          if (!reducedVerbosity)
            ui.notifications.info(
              `${newItem.name} already at maximum quantity (${itemQtyLimit}).`
            );
        } else if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(newQty)) {
          let updateItem = {
              _id: existingItem.id,
              data: {
                  quantity: itemQtyLimit
              }
          };
          await this.actor.updateEmbeddedDocuments('Item', [updateItem]);
          if (!reducedVerbosity)
            ui.notifications.info(
              `Added additional quantity to ${newItem.name} to the specified maximum of ${itemQtyLimit}.`
            );
        } else {
          let updateItem = {
            _id: existingItem.id,
            data: {
                quantity: newQty
            }
          };
          // console.log(updateItem);
          await this.actor.updateEmbeddedDocuments('Item', [updateItem]);
          
          if (!reducedVerbosity)
            ui.notifications.info(
              `Added additional ${itemQtyRoll.result} quantity to ${newItem.name}.`
            );
        }
      }
    }
  }

  _createRollTable() {
    let type = "weapon";

    game.packs.map((p) => p.collection);

    const pack = game.packs.find((p) => p.collection === "dnd5e.items");

    let i = 0;

    let output = [];

    pack.getIndex().then((index) =>
      index.forEach(function (arrayItem) {
        var x = arrayItem._id;
        i++;
        pack.getEntity(arrayItem._id).then((packItem) => {
          if (packItem.type === type) {
            let newItem = {
              _id: packItem._id,
              flags: {},
              type: 1,
              text: packItem.name,
              img: packItem.img,
              collection: "Item",
              resultId: packItem._id,
              weight: 1,
              range: [i, i],
              drawn: false,
            };

            output.push(newItem);
          }
        });
      })
    );

    return;
  }

  /* -------------------------------------------- */

  /**
   * Handle sheet type change
   * @private
   */
  async _changeSheetType(event, html) {
    event.preventDefault();
    // console.log("Loot Sheet | Sheet Type changed", event);

    let currentActor = this.actor;

    let selectedIndex = event.target.selectedIndex;

    let selectedItem = event.target[selectedIndex].value;

    await currentActor.setFlag(
      "lootsheet-simple",
      "lootsheettype",
      selectedItem
    );
  }

  /* -------------------------------------------- */

  /**
   * Handle buy item
   * @private
   */
  _buyItem(event, all = 0) {
    event.preventDefault();
    // console.log("Loot Sheet | Buy Item clicked");

    let targetGm = null;
    game.users.forEach((u) => {
      if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
        targetGm = u;
      }
    });

    if (!targetGm) {
      return ui.notifications.error(
        "No active GM on your scene, they must be online and on the same scene to purchase an item."
      );
    }

    if (this.token === null) {
      return ui.notifications.error(`You must purchase items from a token.`);
    }
    // console.log(game.user.character);
    if (!game.user.character) {
      // console.log("Loot Sheet | No active character for user");
      return ui.notifications.error(`No active character for user.`);
    }

    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const targetItem = this.actor.getEmbeddedDocument("Item", itemId);

    const item = {
      itemId: itemId,
      quantity: 1,
    };
    if (all || event.shiftKey) {
      item.quantity = targetItem.system.quantity;
    }

    const packet = {
      type: "buy",
      buyerId: game.user.character._id,
      tokenId: this.token.id,
      itemId: itemId,
      quantity: 1,
      processorId: targetGm.id,
    };

    if (targetItem.system.quantity === item.quantity) {
      console.log(
        "LootSheet5e",
        "Sending buy request to " + targetGm.name,
        packet
      );
      game.socket.emit(LootSheet5eNPC.SOCKET, packet);
      return;
    }

    const d = new QuantityDialog(
      (quantity) => {
        packet.quantity = quantity;
        console.log(
          "LootSheet5e",
          "Sending buy request to " + targetGm.name,
          packet
        );
        game.socket.emit(LootSheet5eNPC.SOCKET, packet);
      },
      {
        acceptLabel: "Purchase",
      }
    );
    d.render(true);
  }

  /* -------------------------------------------- */
  /**
   * Handle Loot item
   * @private
   */
  _lootItem(event, all = 0) {
    event.preventDefault();
    // console.log("Loot Sheet | Loot Item clicked");

    let targetGm = null;
    game.users.forEach((u) => {
      if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
        targetGm = u;
      }
    });

    if (!targetGm) {
      return ui.notifications.error(
        "No active GM on your scene, they must be online and on the same scene to purchase an item."
      );
    }

    if (this.token === null) {
      return ui.notifications.error(`You must loot items from a token.`);
    }
    if (!game.user.character) {
      // console.log("Loot Sheet | No active character for user");
      return ui.notifications.error(`No active character for user.`);
    }

    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const targetItem = this.actor.getEmbeddedDocument("Item", itemId);

    const item = {
      itemId: itemId,
      quantity: 1,
    };
    if (all || event.shiftKey) {
      item.quantity = targetItem.system.quantity;
    }

    const packet = {
      type: "loot",
      looterId: game.user.character._id,
      tokenId: this.token.id,
      items: [item],
      processorId: targetGm.id,
    };

    if (targetItem.system.quantity === item.quantity) {
      console.log(
        "LootSheet5e",
        "Sending loot request to " + targetGm.name,
        packet
      );
      game.socket.emit(LootSheet5eNPC.SOCKET, packet);
      return;
    }

    const d = new QuantityDialog(
      (quantity) => {
        packet.items[0]["quantity"] = quantity;
        console.log(
          "LootSheet5e",
          "Sending loot request to " + targetGm.name,
          packet
        );
        game.socket.emit(LootSheet5eNPC.SOCKET, packet);
      },
      {
        acceptLabel: "Loot",
      }
    );
    d.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle Loot coins
   * @private
   */
  _lootCoins(event) {
    event.preventDefault();
    if (!game.settings.get("lootsheet-simple", "lootCurrency")) {
      return;
    }
    // console.log("Loot Sheet | Loot Coins clicked");

    let targetGm = null;
    game.users.forEach((u) => {
      if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
        targetGm = u;
      }
    });

    if (!targetGm) {
      return ui.notifications.error(
        "No active GM on your scene, they must be online and on the same scene to loot coins."
      );
    }

    if (this.token === null) {
      return ui.notifications.error(`You must loot coins from a token.`);
    }
    if (!game.user.character) {
      // console.log("Loot Sheet | No active character for user");
      return ui.notifications.error(`No active character for user.`);
    }

    const packet = {
      type: "lootCoins",
      looterId: game.user.character._id,
      tokenId: this.token.id,
      processorId: targetGm.id,
    };
    console.log(
      "LootSheet5e",
      "Sending loot request to " + targetGm.name,
      packet
    );
    game.socket.emit(LootSheet5eNPC.SOCKET, packet);
  }

  /* -------------------------------------------- */

  /**
   * Handle Loot all
   * @private
   */
  _lootAll(event, html) {
    event.preventDefault();
    // console.log("Loot Sheet | Loot All clicked");
    this._lootCoins(event);

    let targetGm = null;
    game.users.forEach((u) => {
      if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
        targetGm = u;
      }
    });

    if (!targetGm) {
      return ui.notifications.error(
        "No active GM on your scene, they must be online and on the same scene to purchase an item."
      );
    }

    if (this.token === null) {
      return ui.notifications.error(`You must loot items from a token.`);
    }
    if (!game.user.character) {
      // console.log("Loot Sheet | No active character for user");
      return ui.notifications.error(`No active character for user.`);
    }

    const itemTargets = html.find(".item[data-item-id]");
    if (!itemTargets) {
      return;
    }

    const items = [];
    for (let i of itemTargets) {
      const itemId = i.getAttribute("data-item-id");
      const item = this.actor.getEmbeddedDocument("Item", itemId);
      items.push({
        itemId: itemId,
        quantity: item.system.quantity,
      });
    }
    if (items.length === 0) {
      return;
    }

    const packet = {
      type: "loot",
      looterId: game.user.character._id,
      tokenId: this.token.id,
      items: items,
      processorId: targetGm.id,
    };

    console.log(
      "LootSheet5e",
      "Sending loot request to " + targetGm.name,
      packet
    );
    game.socket.emit(LootSheet5eNPC.SOCKET, packet);
  }

  /* -------------------------------------------- */

  /**
   * Handle price modifier
   * @private
   */
  async _priceModifier(event) {
    event.preventDefault();

    let priceModifier = await this.actor.getFlag(
      "lootsheet-simple",
      "priceModifier"
    );
    if (typeof priceModifier !== "number") priceModifier = 1.0;

    priceModifier = Math.round(priceModifier * 100);

    const maxModifier = game.settings.get(
      "lootsheet-simple",
      "maxPriceIncrease"
    );

    var html =
      "<p>Use this slider to increase or decrease the price of all items in this inventory. <i class='fa fa-question-circle' title='This uses a percentage factor where 100% is the current price, 0% is 0, and 200% is double the price.'></i></p>";
    html +=
      '<p><input name="price-modifier-percent" id="price-modifier-percent" type="range" min="0" max="' +
      maxModifier +
      '" value="' +
      priceModifier +
      '" class="slider"></p>';
    html +=
      '<p><label>Percentage:</label> <input type=number min="0" max="' +
      maxModifier +
      '" value="' +
      priceModifier +
      '" id="price-modifier-percent-display"></p>';
    html +=
      '<script>var pmSlider = document.getElementById("price-modifier-percent"); var pmDisplay = document.getElementById("price-modifier-percent-display"); pmDisplay.value = pmSlider.value; pmSlider.oninput = function() { pmDisplay.value = this.value; }; pmDisplay.oninput = function() { pmSlider.value = this.value; };</script>';

    let d = new Dialog({
      title: "Price Modifier",
      content: html,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "Update",
          callback: () =>
            this.actor.setFlag(
              "lootsheet-simple",
              "priceModifier",
              document.getElementById("price-modifier-percent").value / 100
            ),
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => console.log("Loot Sheet | Price Modifier Cancelled"),
        },
      },
      default: "two",
      close: () => console.log("Loot Sheet | Price Modifier Closed"),
    });
    d.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle distribution of coins
   * @private
   */
  _distributeCoins(event) {
    event.preventDefault();

    let targetGm = null;
    game.users.forEach((u) => {
      if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
        targetGm = u;
      }
    });

    if (!targetGm) {
      return ui.notifications.error(
        "No active GM on your scene, they must be online and on the same scene to purchase an item."
      );
    }

    if (this.token === null) {
      return ui.notifications.error(`You must loot items from a token.`);
    }

    if (game.user.isGM) {
      //don't use socket
      let container = canvas.tokens.get(this.token.id);
      this._hackydistributeCoins(container.actor);
      return;
    }

    const packet = {
      type: "distributeCoins",
      looterId: game.user.character._id,
      tokenId: this.token.id,
      processorId: targetGm.id,
    };
    console.log(
      "Loot Sheet | Sending distribute coins request to " + targetGm.name,
      packet
    );
    game.socket.emit(LootSheet5eNPC.SOCKET, packet);
  }

  _hackydistributeCoins(containerActor) {
    //This is identical as the distributeCoins function defined in the init hook which for some reason can't be called from the above _distributeCoins method of the lootsheet-simple class. I couldn't be bothered to figure out why a socket can't be called as the GM... so this is a hack but it works.
    let actorData = containerActor.data;
    let observers = [];
    let players = game.users.players;

    // Calculate observers
    for (let player of players) {
      let playerPermission = LootSheet5eNPCHelper.getLootPermissionForPlayer(
        actorData,
        player
      );
      if (player != "default" && playerPermission >= 2) {
        let actor = game.actors.get(player.data.character);
        if (actor != null && (player.data.role === 1 || player.data.role === 2))
          observers.push(actor);
      }
    }

    if (observers.length === 0) return;

    // Calculate split of currency
    let currencySplit = duplicate(
      LootSheet5eNPCHelper.convertCurrencyFromObject(containerActor.system.currency)
    );

    // keep track of the remainder
    let currencyRemainder = {};

    for (let c in currencySplit) {
      if (observers.length) {
        // calculate remainder
        currencyRemainder[c] = currencySplit[c] % observers.length;

        currencySplit[c] = Math.floor(currencySplit[c] / observers.length);
      } else currencySplit[c] = 0;
    }

    // add currency to actors existing coins
    let msg = [];
    for (let u of observers) {
      if (u === null) continue;

      msg = [];
      let currency = LootSheet5eNPCHelper.convertCurrencyFromObject(
          u.system.currency
        ),
        newCurrency = duplicate(
          LootSheet5eNPCHelper.convertCurrencyFromObject(u.system.currency)
        );

      for (let c in currency) {
        // add msg for chat description
        if (currencySplit[c]) {
          msg.push(` ${currencySplit[c]} ${c} coins`);
        }
        if (currencySplit[c] != null) {
          // Add currency to permitted actor
          newCurrency[c] = parseInt(currency[c] || 0) + currencySplit[c];
          u.update({
            "data.currency": newCurrency,
          });
        }
      }

      // Remove currency from loot actor.
      let lootCurrency = LootSheet5eNPCHelper.convertCurrencyFromObject(
          containerActor.system.currency
        ),
        zeroCurrency = {};

      for (let c in lootCurrency) {
        zeroCurrency[c] = {
          type: currencySplit[c].type,
          label: currencySplit[c].type,
          value: currencyRemainder[c],
        };
        containerActor.update({
          "data.currency": zeroCurrency,
        });
      }

      // Create chat message for coins received
      if (msg.length != 0) {
        let message = `${u.name} receives: `;
        message += msg.join(",");
        ChatMessage.create({
          user: game.user._id,
          speaker: {
            actor: containerActor,
            alias: containerActor.name,
          },
          content: message,
        });
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling permissions
   * @private
   */
  _onCyclePermissionProficiency(event) {
    event.preventDefault();

    let field = $(event.currentTarget).siblings('input[type="hidden"]');

    let level = parseFloat(field.val());
    if (typeof level === undefined) level = 0;

    const levels = [0, 2, 3]; //const levels = [0, 2, 3];

    let idx = levels.indexOf(level),
      newLevel = levels[idx === levels.length - 1 ? 0 : idx + 1];

    let playerId = field[0].name;

    this._updatePermissions(this.actor, playerId, newLevel, event);

    this._onSubmit(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling bulk permissions
   * @private
   */
  _onCyclePermissionProficiencyBulk(event) {
    event.preventDefault();

    let actorData = this.actor.data;

    let field = $(event.currentTarget)
      .parent()
      .siblings('input[type="hidden"]');
    let level = parseFloat(field.val());
    if (typeof level === undefined || level === 999) level = 0;

    const levels = [0, 3, 2]; //const levels = [0, 2, 3];

    let idx = levels.indexOf(level),
      newLevel = levels[idx === levels.length - 1 ? 0 : idx + 1];

    let users = game.users.entities;

    let currentPermissions = duplicate(actorData.permission);
    for (let u of users) {
      if (u.data.role === 1 || u.data.role === 2) {
        currentPermissions[u._id] = newLevel;
      }
    }
    const lootPermissions = new DocumentOwnershipConfig(this.actor);
    lootPermissions._updateObject(event, currentPermissions);

    this._onSubmit(event);
  }

  _updatePermissions(actorData, playerId, newLevel, event) {
    // Read player permission on this actor and adjust to new level
    let currentPermissions = duplicate(actorData.ownership);
    console.log(currentPermissions);
    currentPermissions[playerId] = newLevel;
    // Save updated player permissions
    const lootPermissions = new DocumentOwnershipConfig(this.actor);
    lootPermissions._updateObject(event, currentPermissions);
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Items for Loot NPC sheets
   * @private
   */
  _prepareItems(actorData) {
    // Actions
    const features = {
      weapons: {
        label: "Weapons",
        items: [],
        type: "weapon",
      },
      equipment: {
        label: "Equipment",
        items: [],
        type: "equipment",
      },
      consumables: {
        label: "Consumables",
        items: [],
        type: "consumable",
      },
      tools: {
        label: "Tools",
        items: [],
        type: "tool",
      },
      containers: {
        label: "Containers",
        items: [],
        type: "container",
      },
      loot: {
        label: "Loot",
        items: [],
        type: "loot",
      },
    };

    // Iterate through items, allocating to containers
    let items = actorData.items;
    if (items) {
      items = items.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
      for (let i of items) {
        // Features
        if (i.type === "weapon") features.weapons.items.push(i);
        else if (i.type === "equipment") features.equipment.items.push(i);
        else if (i.type === "consumable") features.consumables.items.push(i);
        else if (i.type === "tool") features.tools.items.push(i);
        else if (["container", "backpack"].includes(i.type))
          features.containers.items.push(i);
        else if (i.type === "loot") features.loot.items.push(i);
        //else features.loot.items.push(i);
      }
    }

    // Assign and return
    actorData.actor.features = features;
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display the permission level.
   * @private
   */
  _getPermissionIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i>',
      2: '<i class="fas fa-eye"></i>',
      3: '<i class="fas fa-check"></i>',
      999: '<i class="fas fa-users"></i>',
    };
    return icons[level];
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display the permission level.
   * @private
   */
  _getPermissionDescription(level) {
    const description = {
      0: "None (cannot access sheet)",
      2: "Observer (access to sheet but can only loot or purchase items)",
      3: "Owner (full access)",
      999: "Change all permissions",
    };
    return description[level];
  }

  /* -------------------------------------------- */

  /**
   * Prepares GM settings to be rendered by the loot sheet.
   * @private
   */
  _prepareGMSettings(context) {
    const playerData = [], observers = [];
    //console.log(game.users);
    //console.log("context", context);

    let players = game.users;

    for (let player of players) {
      
      //console.log(player);

        if (player.character) {
        player.playerId = player._id;
        //player.name = player.name;
        player.actor = player.character.name;

        player.lootPermission = LootSheet5eNPCHelper.getLootPermissionForPlayer(
          context,
          player
        );

        //console.log("player", player);

        player.icon = this._getPermissionIcon(player.lootPermission);
        player.lootPermissionDescription = this._getPermissionDescription(
          player.lootPermission
        );
        playerData.push(player);
      
      }
      
    }

    let loot = {};
    loot.players = playerData;
    context.flags.loot = loot;
  }
}

//Register the loot sheet
Actors.registerSheet("dnd5e", LootSheet5eNPC, {
  types: ["npc"],
  makeDefault: false,
});

Hooks.once("init", () => {
  // console.log("Lootsheet: Test2");

  Handlebars.registerHelper("ifeq", function (a, b, options) {
    if (a == b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  game.settings.register("lootsheet-simple", "buyChat", {
    name: "Display chat message for purchases?",
    hint: "If enabled, a chat message will display purchases of items from the loot sheet.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("lootsheet-simple", "lootCurrency", {
    name: "Loot currency?",
    hint: "If enabled, players will have the option to loot all currency to their character, in addition to splitting the currency between players.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("lootsheet-simple", "lootAll", {
    name: "Loot all?",
    hint: "If enabled, players will have the option to loot all items to their character, currency will follow the 'Loot Currency?' setting upon Loot All.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("lootsheet-simple", "showStackWeight", {
    name: "Show Stack Weight?",
    hint: "If enabled, shows the weight of the entire stack next to the item weight",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  game.settings.register("lootsheet-simple", "reduceUpdateVerbosity", {
    name: "Reduce Update Shop Verbosity",
    hint: "If enabled, no notifications will be created every time an item is added to the shop.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("lootsheet-simple", "maxPriceIncrease", {
    name: "Maximum Price Increase",
    hint: "Change the maximum price increase for a merchant in percent",
    scope: "world",
    config: true,
    default: 200,
    type: Number,
  });

  game.settings.register("lootsheet-simple", "includeCurrencyWeight", {
    name: "Include Currency Weight",
    hint: "Include the weight of the currency in the Total Weight calculation.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  function chatMessage(speaker, owner, message, item) {
    if (game.settings.get("lootsheet-simple", "buyChat")) {
      message =
        `
            <div class="dnd5e chat-card item-card" data-actor-id="${owner._id}" data-item-id="${item._id}">
                <header class="card-header flexrow">
                    <img src="${item.img}" title="${item.name}" width="36" height="36">
                    <h3 class="item-name">${item.name}</h3>
                </header>

                <div class="message-content">
                    <p>` +
        message +
        `</p>
                </div>
            </div>
            `;
      ChatMessage.create({
        user: game.user._id,
        speaker: {
          actor: speaker,
          alias: speaker.name,
        },
        content: message,
      });
    }
  }

  function errorMessageToActor(target, message) {
    game.socket.emit(LootSheet5eNPC.SOCKET, {
      type: "error",
      targetId: target.id,
      message: message,
    });
  }

  async function moveItems(source, destination, items) {
    // console.log(source);
    // console.log(destination);
    // console.log(items);

    const updates = [];
    const deletes = [];
    const additions = [];
    const destUpdates = [];
    const results = [];
    for (let i of items) {
      let itemId = i.itemId;
      let quantity = i.quantity;
      let item = source.getEmbeddedDocument("Item", itemId);

      // console.log("ITEM: \n");
      // console.log(item);

      // Move all items if we select more than the quantity.
      if (item.system.quantity < quantity) {
        quantity = item.system.quantity;
      }

      //let newItem = duplicate(item);
      let newItem = duplicate(item);
      // console.log("NEWITEM: \n");
      // console.log(newItem);

      const update = {
        _id: itemId,
        "data.quantity": item.system.quantity - quantity,
      };

      // console.log("UPDATE: \n");
      // console.log(update);

      if (update["data.quantity"] === 0) {
        deletes.push(itemId);
      } else {
        updates.push(update);
      }

      newItem.system.quantity = quantity;
      // console.log("NEWITEM2: \n");
      // console.log(newItem);

      results.push({
        item: newItem,
        quantity: quantity,
      });
      /* let destItem = destination.data.items.find(i => i.name == newItem.name);
			// console.log("DESTITEM: \n"); 
			// console.log(destItem); */
      additions.push(newItem);
      /* if (destItem === undefined) {
                additions.push(newItem);
            } else {
                // console.log("Existing Item");
				newItem.data.quantity = Number(destitem.system.quantity) + Number(newItem.data.quantity);
				additions.push(newItem);
				
            } */
    }

    if (deletes.length > 0) {
      await source.deleteEmbeddedDocuments("Item", deletes);
    }

    if (updates.length > 0) {
      await source.updateEmbeddedDocuments("Item", updates);
    }

    if (additions.length > 0) {
      await destination.createEmbeddedDocuments("Item", additions);
    }

    if (destUpdates.length > 0) {
      await destination.updateEmbeddedDocuments("Item", destUpdates);
    }

    return results;
  }

  async function lootItems(container, looter, items) {
    let moved = await moveItems(container, looter, items);

    for (let m of moved) {
      chatMessage(
        container,
        looter,
        `${looter.name} looted ${m.quantity} x ${m.item.name}.`,
        m.item
      );
    }
  }

  async function transaction(seller, buyer, itemId, quantity) {
    let sellItem = seller.getEmbeddedDocument("Item", itemId);

    // If the buyer attempts to buy more then what's in stock, buy all the stock.
    if (sellItem.system.quantity < quantity) {
      quantity = sellItem.system.quantity;
    }

    // On negative quantity we show an error
    if (quantity < 0) {
      errorMessageToActor(buyer, `Can not buy negative amounts of items.`);
      return;
    }

    // On 0 quantity skip everything to avoid error down the line
    if (quantity == 0) {
      errorMessageToActor(buyer, `Not enought items on vendor.`);
      return;
    }

    let sellerModifier = seller.getFlag("lootsheet-simple", "priceModifier");
    if (typeof sellerModifier !== "number") sellerModifier = 1.0;

    let itemCostRaw =
      Math.round(sellItem.system.price.value * sellerModifier * 100) / 100;
    let itemCostDenomination = sellItem.system.price.denomination;

    itemCostRaw *= quantity;

    // console.log("itemCostRaw", itemCostRaw);
    // console.log("itemCostDenomination", itemCostDenomination);

    let buyerFunds = duplicate(
      LootSheet5eNPCHelper.convertCurrencyFromObject(buyer.system.currency)
    );

    let sellerFunds = duplicate(
      LootSheet5eNPCHelper.convertCurrencyFromObject(seller.system.currency)
    );

    // console.log("sellerFunds before", sellerFunds);
    // console.log("buyerFunds before purchase", buyerFunds);

    const conversionRates = {
      pp: 1,
      gp: 10,
      ep: 50,
      sp: 100,
      cp: 1000,
    };

    const compensationCurrency = {
      pp: "gp",
      gp: "sp",
      ep: "sp",
      sp: "cp",
    };

    let itemCostInPlatinum = itemCostRaw / conversionRates[itemCostDenomination];
     // console.log(`itemCostInPlatinum : ${itemCostInPlatinum}`);

    let buyerFundsAsPlatinum = buyerFunds["pp"];
    buyerFundsAsPlatinum += buyerFunds["gp"] / conversionRates["gp"];
    buyerFundsAsPlatinum += buyerFunds["ep"] / conversionRates["ep"];
    buyerFundsAsPlatinum += buyerFunds["sp"] / conversionRates["sp"];
    buyerFundsAsPlatinum += buyerFunds["cp"] / conversionRates["cp"];

    let sellerFundsAsPlatinum = sellerFunds["pp"];
    sellerFundsAsPlatinum += sellerFunds["gp"] / conversionRates["gp"];
    sellerFundsAsPlatinum += sellerFunds["ep"] / conversionRates["ep"];
    sellerFundsAsPlatinum += sellerFunds["sp"] / conversionRates["sp"];
    sellerFundsAsPlatinum += sellerFunds["cp"] / conversionRates["cp"];

    // console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);
    
    if (itemCostInPlatinum > buyerFundsAsPlatinum) {
      errorMessageToActor(buyer, `Not enough funds to purchase item.`);
      return;
    }

    buyerFundsAsPlatinum -= itemCostInPlatinum;
    sellerFundsAsPlatinum += itemCostInPlatinum;

    // Remove every coin we have
    for (let currency in buyerFunds) {
      buyerFunds[currency] = 0;
    }
    for (let currency in sellerFunds) {
      sellerFunds[currency] = 0;
    }

    // Give us fractions of platinum coins, which will be smoothed out below
    buyerFunds["pp"] = buyerFundsAsPlatinum;
    sellerFunds["pp"] = sellerFundsAsPlatinum;

    // console.log("buyerFunds after purchase", buyerFunds);
    // console.log(`Smoothing out`);

    // Finally we exchange partial coins with as little change as possible
    for (let currency in sellerFunds) {
      //fuck EP
      if (currency == "ep") continue;
      // console.log("----------------");
      let amount = sellerFunds[currency];
      // console.log("smoothing " + currency);
      // console.log("fractional value", amount);
      // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
      // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
      // If we would floor 15.99999999999918 everything explodes
      let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
      // if (currency == "sp") {
      //   // console.log("adjusting for sp");
      //   newFund = newFund / 10;
      // }

      // console.log("rounded value", newFund);
      sellerFunds[currency] = newFund;

      let compCurrency = compensationCurrency[currency];

      // We dont care about fractions of CP
      if (currency != "cp") {
        // We calculate the amount of lower currency we get for the fraction of higher currency we have
        let toAdd = (Math.round((amount - newFund) * 1e5) / 1e5) * 10;

        // console.log("value to add to lower currency of " + compCurrency, toAdd);
        sellerFunds[compCurrency] += toAdd;
        // console.log("new value of " + compCurrency, buyerFunds[compCurrency]);
      }
    }

    for (let currency in buyerFunds) {
      //fuck EP
      if (currency == "ep") continue;
      // console.log("----------------");
      let amount = buyerFunds[currency];
      // console.log("smoothing " + currency);
      // console.log("fractional value", amount);
      // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
      // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
      // If we would floor 15.99999999999918 everything explodes
      let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
      // if (currency == "sp") {
      //   // console.log("adjusting for sp");
      //   newFund = newFund / 10;
      // }

      // console.log("rounded value", newFund);
      buyerFunds[currency] = newFund;

      let compCurrency = compensationCurrency[currency];

      // We dont care about fractions of CP
      if (currency != "cp") {
        // We calculate the amount of lower currency we get for the fraction of higher currency we have
        let toAdd = (Math.round((amount - newFund) * 1e5) / 1e5) * 10;

        // console.log("value to add to lower currency of " + compCurrency, toAdd);
        buyerFunds[compCurrency] += toAdd;
        // console.log("new value of " + compCurrency, buyerFunds[compCurrency]);
      }
    }

    // Update buyer's funds
    buyer.update({
      "data.currency": buyerFunds,
    });

    // Update seller's funds
    seller.update({
      "data.currency": sellerFunds,
    });

    let moved = await moveItems(seller, buyer, [
      {
        itemId,
        quantity,
      },
    ]);

    for (let m of moved) {
      chatMessage(
        seller,
        buyer,
        `${buyer.name} purchases ${quantity} x ${m.item.name} for ${itemCostRaw}${itemCostDenomination}.`,
        m.item
      );
    }
  }

  function distributeCoins(containerActor) {
    let actorData = containerActor.data;
    let observers = [];
    let players = game.users.players;

    // Calculate observers
    for (let player of players) {
      let playerPermission = LootSheet5eNPCHelper.getLootPermissionForPlayer(
        actorData,
        player
      );
      if (player != "default" && playerPermission >= 2) {
        let actor = game.actors.get(player.data.character);
        if (actor != null && (player.data.role === 1 || player.data.role === 2))
          observers.push(actor);
      }
    }

    if (observers.length === 0) return;

    // Calculate split of currency
    let currencySplit = duplicate(
      LootSheet5eNPCHelper.convertCurrencyFromObject(containerActor.system.currency)
    );

    // keep track of the remainder
    let currencyRemainder = {};

    for (let c in currencySplit) {
      if (observers.length) {
        // calculate remainder
        currencyRemainder[c] = currencySplit[c] % observers.length;

        currencySplit[c] = Math.floor(currencySplit[c] / observers.length);
      } else currencySplit[c] = 0;
    }

    // add currency to actors existing coins
    let msg = [];
    for (let u of observers) {
      if (u === null) continue;

      msg = [];
      let currency = LootSheet5eNPCHelper.convertCurrencyFromObject(
          u.system.currency
        ),
        newCurrency = duplicate(
          LootSheet5eNPCHelper.convertCurrencyFromObject(u.system.currency)
        );

      for (let c in currency) {
        // add msg for chat description
        if (currencySplit[c]) {
          msg.push(` ${currencySplit[c]} ${c} coins`);
        }

        // Add currency to permitted actor
        newCurrency[c] = parseInt(currency[c] || 0) + currencySplit[c];

        u.update({
          "data.currency": newCurrency,
        });
      }

      // Remove currency from loot actor.
      let lootCurrency = LootSheet5eNPCHelper.convertCurrencyFromObject(
          containerActor.system.currency
        ),
        zeroCurrency = {};

      for (let c in lootCurrency) {
        zeroCurrency[c] = {
          type: currencySplit[c].type,
          label: currencySplit[c].type,
          value: currencyRemainder[c],
        };
        containerActor.update({
          "data.currency": zeroCurrency,
        });
      }

      // Create chat message for coins received
      if (msg.length != 0) {
        let message = `${u.name} receives: `;
        message += msg.join(",");
        ChatMessage.create({
          user: game.user._id,
          speaker: {
            actor: containerActor,
            alias: containerActor.name,
          },
          content: message,
        });
      }
    }
  }

  function lootCoins(containerActor, looter) {

    let sheetCurrency = LootSheet5eNPCHelper.convertCurrencyFromObject(
      containerActor.system.currency
    );

    // add currency to actors existing coins
    let msg = [];
    let currency = LootSheet5eNPCHelper.convertCurrencyFromObject(
        looter.system.currency
      ),
      newCurrency = duplicate(
        LootSheet5eNPCHelper.convertCurrencyFromObject(
          looter.system.currency
        )
      );

    for (let c in currency) {
      // add msg for chat description
      if (sheetCurrency[c]) {
        msg.push(` ${sheetCurrency[c]} ${c} coins`);
      }
      if (sheetCurrency[c] != null) {
        // Add currency to permitted actor
        newCurrency[c] =
          parseInt(currency[c] || 0) + parseInt(sheetCurrency[c]);
        looter.update({
          "data.currency": newCurrency,
        });
      }
    }

    // Remove currency from loot actor.
    let lootCurrency = LootSheet5eNPCHelper.convertCurrencyFromObject(
        containerActor.system.currency
      ),
      zeroCurrency = {};
    // console.log("lootCurrency", lootCurrency);
    for (let c in lootCurrency) {
      zeroCurrency[c] = 0;
      containerActor.update({
         "data.currency": zeroCurrency,
      });
    }
    // console.log("zeroCurrency", zeroCurrency);
    // Create chat message for coins received
    if (msg.length != 0) {
      let message = `${looter.name} receives: `;
      message += msg.join(",");
      ChatMessage.create({
        user: game.user._id,
        speaker: {
          actor: containerActor,
          alias: containerActor.name,
        },
        content: message,
      });
    }
  }

  game.socket.on(LootSheet5eNPC.SOCKET, (data) => {
    // console.log("Loot Sheet | Socket Message: ", data);
    if (game.user.isGM && data.processorId === game.user.id) {
      if (data.type === "buy") {
        let buyer = game.actors.get(data.buyerId);
        let seller = canvas.tokens.get(data.tokenId);

        if (buyer && seller && seller.actor) {
          transaction(seller.actor, buyer, data.itemId, data.quantity);
        } else if (!seller) {
          errorMessageToActor(
            buyer,
            "GM not available, the GM must on the same scene to purchase an item."
          );
          ui.notifications.error(
            "Player attempted to purchase an item on a different scene."
          );
        }
      }

      if (data.type === "loot") {
        let looter = game.actors.get(data.looterId);
        let container = canvas.tokens.get(data.tokenId);

        if (looter && container && container.actor) {
          lootItems(container.actor, looter, data.items);
        } else if (!container) {
          errorMessageToActor(
            looter,
            "GM not available, the GM must on the same scene to loot an item."
          );
          ui.notifications.error(
            "Player attempted to loot an item on a different scene."
          );
        }
      }

      if (data.type === "distributeCoins") {
        let container = canvas.tokens.get(data.tokenId);
        if (!container || !container.actor) {
          errorMessageToActor(
            looter,
            "GM not available, the GM must on the same scene to distribute coins."
          );
          return ui.notifications.error(
            "Player attempted to distribute coins on a different scene."
          );
        }
        distributeCoins(container.actor);
      }

      if (data.type === "lootCoins") {
        let looter = game.actors.get(data.looterId);
        let container = canvas.tokens.get(data.tokenId);
        if (!container || !container.actor || !looter) {
          errorMessageToActor(
            looter,
            "GM not available, the GM must on the same scene to loot coins."
          );
          return ui.notifications.error(
            "Player attempted to loot coins on a different scene."
          );
        }
        lootCoins(container.actor, looter);
      }
    }
    if (data.type === "error" && data.targetId === game.user.character._id) {
       console.log("Loot Sheet | Transaction Error: ", data.message);
      return ui.notifications.error(data.message);
    }
  });
});

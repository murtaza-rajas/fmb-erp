const BaseRepository = require('./base.repository');
const Item = require('../models/Item.model');

class ItemRepository extends BaseRepository {
  constructor() {
    super(Item);
  }

  findBySku(sku) {
    return this.model.findOne({ sku: sku.toUpperCase() });
  }
}

module.exports = new ItemRepository();

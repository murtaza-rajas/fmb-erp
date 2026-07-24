const BaseRepository = require('./base.repository');
const Permission = require('../models/Permission.model');

class PermissionRepository extends BaseRepository {
  constructor() {
    super(Permission);
  }

  findByKeys(keys) {
    return this.model.find({ key: { $in: keys } }).exec();
  }
}

module.exports = new PermissionRepository();

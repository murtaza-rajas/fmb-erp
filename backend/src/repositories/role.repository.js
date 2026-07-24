const BaseRepository = require('./base.repository');
const Role = require('../models/Role.model');

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  findByName(name) {
    return this.model.findOne({ name }).populate('permissions').exec();
  }
}

module.exports = new RoleRepository();

const BaseRepository = require('./base.repository');
const User = require('../models/User.model');
const Role = require('../models/Role.model');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  findByEmail(email, { includePassword = false } = {}) {
    const query = this.model.findOne({ email: email.toLowerCase() });
    if (includePassword) query.select('+passwordHash');
    return query.populate({ path: 'roleId', populate: { path: 'permissions' } }).exec();
  }

  // Used to fan out notifications to whoever holds a given role (e.g. "notify
  // Finance & HR that a voucher needs approval") without a full
  // permission-based lookup — role name is sufficient for the seeded roles.
  async findActiveByRoleNames(roleNames) {
    const roles = await Role.find({ name: { $in: roleNames } });
    return this.model.find({ roleId: { $in: roles.map((r) => r._id) }, status: 'active', isDeleted: false });
  }
}

module.exports = new UserRepository();

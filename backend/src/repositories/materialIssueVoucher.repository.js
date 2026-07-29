const BaseRepository = require('./base.repository');
const MaterialIssueVoucher = require('../models/MaterialIssueVoucher.model');

module.exports = new BaseRepository(MaterialIssueVoucher);

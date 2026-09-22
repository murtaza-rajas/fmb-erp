const BaseRepository = require('./base.repository');
const Expense = require('../models/Expense.model');

module.exports = new BaseRepository(Expense);

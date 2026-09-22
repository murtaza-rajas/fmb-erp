const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const expenseService = require('../services/expense.service');

const create = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: expense });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, filter } = req.query.parsed;
  const { items, total } = await expenseService.listExpenses({ page, limit, sort, search, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.params.id);
  ApiResponse.send(res, { data: expense });
});

const approve = asyncHandler(async (req, res) => {
  const expense = await expenseService.approveExpense(req.params.id, req.user._id);
  ApiResponse.send(res, { data: expense });
});

const reject = asyncHandler(async (req, res) => {
  const expense = await expenseService.rejectExpense(req.params.id, req.body.reason, req.user._id);
  ApiResponse.send(res, { data: expense });
});

module.exports = { create, list, getById, approve, reject };

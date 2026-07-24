const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const debitNoteService = require('../services/debitNote.service');

const create = asyncHandler(async (req, res) => {
  const dn = await debitNoteService.createDebitNote(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: dn });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await debitNoteService.listDebitNotes({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const dn = await debitNoteService.getDebitNoteById(req.params.id);
  ApiResponse.send(res, { data: dn });
});

const settle = asyncHandler(async (req, res) => {
  const dn = await debitNoteService.settleDebitNote(req.params.id, req.user._id);
  ApiResponse.send(res, { data: dn });
});

module.exports = { create, list, getById, settle };

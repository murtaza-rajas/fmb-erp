const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const creditNoteService = require('../services/creditNote.service');

const create = asyncHandler(async (req, res) => {
  const cn = await creditNoteService.createCreditNote(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: cn });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await creditNoteService.listCreditNotes({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const cn = await creditNoteService.getCreditNoteById(req.params.id);
  ApiResponse.send(res, { data: cn });
});

const settle = asyncHandler(async (req, res) => {
  const cn = await creditNoteService.settleCreditNote(req.params.id, req.user._id);
  ApiResponse.send(res, { data: cn });
});

module.exports = { create, list, getById, settle };

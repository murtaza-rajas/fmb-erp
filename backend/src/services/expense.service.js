const expenseRepository = require('../repositories/expense.repository');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const notificationService = require('./notification.service');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { APPROVAL_STATUS } = require('../constants/enums');
const { ROLES } = require('../constants/roles');

// Notification failures must never block the underlying action — dispatch is
// fire-and-forget from the caller's perspective (mirrors paymentVoucher.service.js).
async function notifyApprovers(expense) {
  const approvers = await userRepository.findActiveByRoleNames([ROLES.FINANCE_HR, ROLES.SUPER_ADMIN]);
  await Promise.all(
    approvers.map((user) =>
      notificationService
        .dispatch({
          userId: user._id,
          type: 'expense_pending',
          title: 'Expense awaiting approval',
          message: `Expense ${expense.expenseNumber} for ${expense.payeeName} (${expense.amount}) is awaiting your approval.`,
          link: `/finance/expenses/${expense._id}`,
        })
        .catch(() => {})
    )
  );
}

function notifyCreator(expense, title, message) {
  return notificationService
    .dispatch({ userId: expense.createdBy, type: 'expense_status', title, message, link: `/finance/expenses/${expense._id}` })
    .catch(() => {});
}

async function createExpense(payload, actorId) {
  const expenseNumber = await generateDocumentNumber('EXP');
  const expense = await expenseRepository.create({
    expenseNumber,
    category: payload.category,
    payeeName: payload.payeeName,
    description: payload.description,
    amount: payload.amount,
    expenseDate: payload.expenseDate || new Date(),
    fileKey: payload.fileKey,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'create', module: 'expense', entityType: 'Expense', entityId: expense._id, after: expense.toObject() });
  await notifyApprovers(expense);
  return expense;
}

function listExpenses({ page, limit, sort, search, filter }) {
  return expenseRepository.findPaginated({
    page,
    limit,
    sort,
    search,
    searchFields: ['expenseNumber', 'payeeName'],
    filter,
    populate: 'approvedBy',
  });
}

async function getExpenseById(id) {
  const expense = await expenseRepository.findById(id, { populate: 'approvedBy' });
  if (!expense) throw ApiError.notFound('Expense not found');
  return expense;
}

async function approveExpense(id, actorId) {
  const expense = await expenseRepository.findById(id);
  if (!expense) throw ApiError.notFound('Expense not found');
  if (expense.approvalStatus !== APPROVAL_STATUS.PENDING) {
    throw ApiError.conflict(`Expense is already ${expense.approvalStatus}`);
  }

  const updated = await expenseRepository.updateById(id, {
    approvalStatus: APPROVAL_STATUS.APPROVED,
    approvedBy: actorId,
    approvedAt: new Date(),
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'approve', module: 'expense', entityType: 'Expense', entityId: id, before: { approvalStatus: APPROVAL_STATUS.PENDING }, after: { approvalStatus: APPROVAL_STATUS.APPROVED } });
  await notifyCreator(expense, 'Expense approved', `Expense ${expense.expenseNumber} has been approved.`);
  return updated;
}

async function rejectExpense(id, reason, actorId) {
  const expense = await expenseRepository.findById(id);
  if (!expense) throw ApiError.notFound('Expense not found');
  if (expense.approvalStatus !== APPROVAL_STATUS.PENDING) {
    throw ApiError.conflict(`Expense is already ${expense.approvalStatus}`);
  }

  const updated = await expenseRepository.updateById(id, { approvalStatus: APPROVAL_STATUS.REJECTED, rejectionReason: reason, updatedBy: actorId });

  await auditLogService.record({ userId: actorId, action: 'reject', module: 'expense', entityType: 'Expense', entityId: id, before: { approvalStatus: APPROVAL_STATUS.PENDING }, after: { approvalStatus: APPROVAL_STATUS.REJECTED, rejectionReason: reason } });
  await notifyCreator(expense, 'Expense rejected', `Expense ${expense.expenseNumber} was rejected: ${reason}`);
  return updated;
}

module.exports = { createExpense, listExpenses, getExpenseById, approveExpense, rejectExpense };

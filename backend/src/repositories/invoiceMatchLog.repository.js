const InvoiceMatchLog = require('../models/InvoiceMatchLog.model');

class InvoiceMatchLogRepository {
  record(data) {
    return InvoiceMatchLog.create(data);
  }

  findForInvoice(invoiceId) {
    return InvoiceMatchLog.find({ invoiceId }).sort({ matchedAt: -1 }).populate('matchedBy', 'name email');
  }
}

module.exports = new InvoiceMatchLogRepository();

const BaseRepository = require('./base.repository');
const Payment = require('../models/Payment.model');

class PaymentRepository extends BaseRepository {
  constructor() {
    super(Payment);
  }

  findByVoucherId(voucherId, { session } = {}) {
    return Payment.findOne({ voucherId }).session(session ?? null);
  }
}

module.exports = new PaymentRepository();

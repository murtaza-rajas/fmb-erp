const PoStatusHistory = require('../models/PoStatusHistory.model');

class PoStatusHistoryRepository {
  record({ poId, fromStatus, toStatus, changedBy, remarks }, { session } = {}) {
    return PoStatusHistory.create([{ poId, fromStatus, toStatus, changedBy, remarks }], { session }).then(([doc]) => doc);
  }

  findForPo(poId) {
    return PoStatusHistory.find({ poId }).sort({ timestamp: 1 }).populate('changedBy', 'name email');
  }
}

module.exports = new PoStatusHistoryRepository();

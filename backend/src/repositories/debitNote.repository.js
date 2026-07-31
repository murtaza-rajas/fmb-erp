const BaseRepository = require('./base.repository');
const DebitNote = require('../models/DebitNote.model');

class DebitNoteRepository extends BaseRepository {
  findByIds(ids, { session } = {}) {
    return this.model.find({ _id: { $in: ids } }).session(session ?? null);
  }
}

module.exports = new DebitNoteRepository(DebitNote);

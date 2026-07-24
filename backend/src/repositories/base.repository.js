// Generic data-access helpers shared by every repository. Repositories only
// talk to Mongoose models — no business rules live here (see folder-structure.md).
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  create(data, { session } = {}) {
    return this.model.create([data], { session }).then(([doc]) => doc);
  }

  findById(id, { populate, session } = {}) {
    const query = this.model.findById(id).session(session ?? null);
    if (populate) query.populate(populate);
    return query.exec();
  }

  findOne(filter, { populate } = {}) {
    const query = this.model.findOne(filter);
    if (populate) query.populate(populate);
    return query.exec();
  }

  async findPaginated({ filter = {}, page = 1, limit = 20, sort = { createdAt: -1 }, populate, search, searchFields = [] }) {
    const finalFilter = { ...filter };

    if (search && searchFields.length > 0) {
      finalFilter.$or = searchFields.map((field) => ({ [field]: { $regex: search, $options: 'i' } }));
    }

    const query = this.model.find(finalFilter).sort(sort).skip((page - 1) * limit).limit(limit);
    if (populate) query.populate(populate);

    const [items, total] = await Promise.all([
      query.exec(),
      this.model.countDocuments(finalFilter),
    ]);

    return { items, total, page, limit };
  }

  updateById(id, data, { session } = {}) {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true, session });
  }

  async softDeleteById(id, userId, { session } = {}) {
    const doc = await this.model.findById(id).session(session ?? null);
    if (!doc) return null;
    return doc.softDelete(userId, { session });
  }
}

module.exports = BaseRepository;

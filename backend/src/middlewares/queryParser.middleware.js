// Parses ?page&limit&sort&search&filter[field]=value into a normalized req.query.parsed
function queryParser(req, res, next) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  let sort = {};
  if (req.query.sort) {
    for (const field of String(req.query.sort).split(',')) {
      if (field.startsWith('-')) sort[field.slice(1)] = -1;
      else sort[field] = 1;
    }
  } else {
    sort = { createdAt: -1 };
  }

  const filter = {};
  if (req.query.filter && typeof req.query.filter === 'object') {
    for (const [key, value] of Object.entries(req.query.filter)) {
      filter[key] = value;
    }
  }

  req.query.parsed = {
    page,
    limit,
    skip: (page - 1) * limit,
    sort,
    search: req.query.search ? String(req.query.search).trim() : undefined,
    filter,
  };

  next();
}

module.exports = queryParser;

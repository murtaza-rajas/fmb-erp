// express-validator's `.optional({ values: 'falsy' })` (used on every optional
// field in this app) skips *validating* an empty string, but does nothing to
// the value itself — it still reaches the service/repository layer as `''`,
// and Mongoose's ObjectId cast rejects `''` (only `undefined`/`null` are
// treated as "no value"). That mismatch crashes any create/update wherever a
// frontend form submits an unselected optional dropdown as `''` (e.g.
// User.storeId, Category.parentCategoryId, Item.taxId, ...).
//
// Converting `''` to `null` here — once, at the request boundary — fixes the
// cast error and, unlike stripping the key entirely, still lets a client
// explicitly clear a previously-set optional field on update (Mongoose
// applies an explicit `null` `$set`; a missing key would leave the old value
// untouched instead).
function nullifyEmptyStrings(value) {
  if (Array.isArray(value)) {
    return value.map(nullifyEmptyStrings);
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = value[key] === '' ? null : nullifyEmptyStrings(value[key]);
    }
    return value;
  }
  return value;
}

function normalizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    nullifyEmptyStrings(req.body);
  }
  next();
}

module.exports = { normalizeBody };

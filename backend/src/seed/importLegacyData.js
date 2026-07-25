// Standalone, one-time import of legacy vendor + item master data (from
// "vendor list.pdf" and "stock july.pdf"). Run manually with:
//   node backend/src/seed/importLegacyData.js
//
// Deliberately NOT wired into seed/index.js's run() — that pipeline seeds
// foundational auth data (permissions/roles/Super Admin) on every dev setup
// and test run; this script is a one-off historical data import and must
// never run against the test replica set.

const { connectDb, disconnectDb } = require('../config/db');
const Category = require('../models/Category.model');
const Unit = require('../models/Unit.model');
const Item = require('../models/Item.model');
const Vendor = require('../models/Vendor.model');
const legacyVendorsSeedData = require('./legacyVendors.seed');
const {
  legacyItemsSeedData,
  legacyCategoriesSeedData,
  legacyUnitsSeedData,
} = require('./legacyItems.seed');
const logger = require('../utils/logger');

function toSku(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function seedCategories() {
  const ops = legacyCategoriesSeedData.map((c) => ({
    updateOne: { filter: { name: c.name }, update: { $set: c }, upsert: true },
  }));
  await Category.bulkWrite(ops);
  logger.info(`Seeded ${legacyCategoriesSeedData.length} categories`);
}

async function seedUnits() {
  const ops = legacyUnitsSeedData.map((u) => ({
    updateOne: { filter: { name: u.name }, update: { $set: u }, upsert: true },
  }));
  await Unit.bulkWrite(ops);
  logger.info(`Seeded ${legacyUnitsSeedData.length} units`);
}

async function seedItems() {
  const categories = await Category.find({});
  const categoryIdByName = new Map(categories.map((c) => [c.name, c._id]));
  const units = await Unit.find({});
  const unitIdBySymbol = new Map(units.map((u) => [u.symbol, u._id]));

  const ops = legacyItemsSeedData.map(([name, unitSymbol, categoryName]) => {
    const categoryId = categoryIdByName.get(categoryName);
    const unitId = unitIdBySymbol.get(unitSymbol);
    if (!categoryId) throw new Error(`Unknown category "${categoryName}" for item "${name}"`);
    if (!unitId) throw new Error(`Unknown unit "${unitSymbol}" for item "${name}"`);

    const sku = toSku(name);
    return {
      updateOne: {
        filter: { sku },
        update: {
          $set: {
            name,
            sku,
            categoryId,
            unitId,
            reorderLevel: 0,
            standardRate: 0,
          },
        },
        upsert: true,
      },
    };
  });
  await Item.bulkWrite(ops);
  logger.info(`Seeded ${legacyItemsSeedData.length} items`);
}

async function seedVendors() {
  const existingCount = await Vendor.countDocuments();
  if (existingCount > 0) {
    logger.info(`Vendor collection already has ${existingCount} docs, skipping legacy vendor import`);
    return;
  }
  await Vendor.insertMany(legacyVendorsSeedData);
  logger.info(`Seeded ${legacyVendorsSeedData.length} vendors`);
}

async function run() {
  await connectDb();
  await seedCategories();
  await seedUnits();
  await seedItems();
  await seedVendors();
  await disconnectDb();
  logger.info('Legacy data import complete');
  process.exit(0);
}

run().catch((err) => {
  logger.error('Legacy data import failed', { error: err.message, stack: err.stack });
  process.exit(1);
});

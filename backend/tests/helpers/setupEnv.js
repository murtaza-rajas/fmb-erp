const fs = require('fs');

// Point mongodb-memory-server at the system's already-installed mongod when
// one exists (this dev sandbox has no internet access, so a download would
// hang/fail) — but never force a path that doesn't exist, or CI runners
// (which have no system mongod but do have internet access to download one)
// would break instead of falling back to their own download.
const SYSTEM_MONGOD_PATH = '/usr/bin/mongod';
if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(SYSTEM_MONGOD_PATH)) {
  process.env.MONGOMS_SYSTEM_BINARY = SYSTEM_MONGOD_PATH;
}

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';

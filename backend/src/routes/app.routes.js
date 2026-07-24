const { Router } = require('express');
const settingsController = require('../controllers/settings.controller');

const router = Router();

// Public, no auth — mobile app checks this on launch for force-update /
// maintenance-mode gating (see docs/architecture/api-design.md § App Config).
router.get('/config', settingsController.getAppConfig);

module.exports = router;

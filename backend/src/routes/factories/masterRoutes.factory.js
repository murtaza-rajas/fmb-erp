const { Router } = require('express');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

// Builds the standard list/create/read/update/delete route set shared by the
// simple lookup masters (Category, Unit, Tax, Payment Terms). Assumes the
// caller already applied `authenticate` on the parent router.
function createMasterRoutes({ controller, validator }) {
  const router = Router();

  router.get('/', authorize(PERMISSIONS.MASTER_READ), queryParser, controller.list);
  router.post('/', authorize(PERMISSIONS.MASTER_CREATE), validator.create, validate, controller.create);
  router.get('/:id', authorize(PERMISSIONS.MASTER_READ), controller.getById);
  router.patch('/:id', authorize(PERMISSIONS.MASTER_UPDATE), validator.update, validate, controller.update);
  router.delete('/:id', authorize(PERMISSIONS.MASTER_DELETE), controller.remove);

  return router;
}

module.exports = createMasterRoutes;

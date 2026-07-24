const swaggerJsdoc = require('swagger-jsdoc');
const { apiBasePath } = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FMB ERP API',
      version: '1.0.0',
      description: 'Procurement, Inventory, Vendor Payment & Finance ERP for FMB Nagpur',
    },
    servers: [{ url: apiBasePath }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const { apiBasePath, clientOrigin } = require('./config/env');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const { globalRateLimiter } = require('./middlewares/rateLimiter.middleware');
const { normalizeBody } = require('./middlewares/normalizeBody.middleware');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler.middleware');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(normalizeBody);
app.use(cookieParser());
app.use(globalRateLimiter);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(apiBasePath, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

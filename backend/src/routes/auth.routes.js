const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/authenticate.middleware');
const { authRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 */
router.post('/login', authRateLimiter, authValidator.login, validate, authController.login);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     summary: Exchange a refresh token for a new access/refresh token pair
 *     tags: [Auth]
 */
router.post('/refresh-token', authValidator.refreshToken, validate, authController.refresh);

router.post('/logout', authValidator.refreshToken, validate, authController.logout);

router.post('/forgot-password', authRateLimiter, authValidator.forgotPassword, validate, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authValidator.resetPassword, validate, authController.resetPassword);

router.post('/request-otp', authRateLimiter, authValidator.requestOtp, validate, authController.requestOtp);
router.post('/resend-otp', authRateLimiter, authValidator.requestOtp, validate, authController.resendOtp);
router.post('/verify-otp', authRateLimiter, authValidator.verifyOtp, validate, authController.verifyOtp);

router.post('/change-password', authenticate, authValidator.changePassword, validate, authController.changePassword);

router.get('/me', authenticate, authController.me);
router.get('/sessions', authenticate, authController.sessions);
router.delete('/sessions/:id', authenticate, authController.revokeSession);

module.exports = router;

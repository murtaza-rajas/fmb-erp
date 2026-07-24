const admin = require('firebase-admin');
const { firebase } = require('./env');
const logger = require('../utils/logger');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;
  if (!firebase.projectId || !firebase.clientEmail || !firebase.privateKey) {
    logger.warn('Firebase credentials not configured — push notifications disabled');
    return null;
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: firebase.projectId,
      clientEmail: firebase.clientEmail,
      privateKey: firebase.privateKey,
    }),
  });
  initialized = true;
  return admin;
}

module.exports = { initFirebase };

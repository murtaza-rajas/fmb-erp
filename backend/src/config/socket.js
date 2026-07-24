const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { clientOrigin, jwt: jwtConfig } = require('./env');
const logger = require('../utils/logger');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = jwt.verify(token, jwtConfig.accessSecret);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      logger.warn('Socket auth rejected', { error: err.message });
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.info('Socket connected', { userId: socket.userId, socketId: socket.id });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId: socket.userId, socketId: socket.id });
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { initSocket, getIo, emitToUser };

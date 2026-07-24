import { io } from 'socket.io-client';
import { getAccessToken } from './tokenStorage';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

// One shared socket for the whole app, connected once after login and torn
// down on logout — see App.jsx. Matches the backend's JWT-in-handshake auth
// (config/socket.js on the backend).
export function connectSocket() {
  if (socket?.connected) return socket;
  socket = io(socketUrl, { auth: { token: getAccessToken() }, autoConnect: true });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}

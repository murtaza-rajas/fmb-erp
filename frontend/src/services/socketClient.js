import { io } from 'socket.io-client';
import { getAccessToken } from './tokenStorage';

// An explicitly empty VITE_SOCKET_URL means "same origin" (socket.io-client
// connects to the current page's origin when passed undefined) — it must
// NOT fall through to the localhost default, or a same-origin production
// build silently tries to reach a dev server.
const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
const socketUrl = envSocketUrl === undefined ? 'http://localhost:5000' : envSocketUrl || undefined;
const socketPath = import.meta.env.VITE_SOCKET_PATH || '/socket.io';

let socket = null;

// One shared socket for the whole app, connected once after login and torn
// down on logout — see App.jsx. Matches the backend's JWT-in-handshake auth
// (config/socket.js on the backend).
export function connectSocket() {
  if (socket?.connected) return socket;
  socket = io(socketUrl, { path: socketPath, auth: { token: getAccessToken() }, autoConnect: true });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}

// Centralized so the axios client, the auth slice, and the socket client all
// read/write tokens the same way — never touch localStorage directly elsewhere.
const ACCESS_TOKEN_KEY = 'fmb_access_token';
const REFRESH_TOKEN_KEY = 'fmb_refresh_token';
const DEVICE_ID_KEY = 'fmb_device_id';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Stable per-browser id sent as deviceId on login/refresh — lets the backend
// track this as one session among the user's devices.
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

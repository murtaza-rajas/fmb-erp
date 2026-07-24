import { createSlice } from '@reduxjs/toolkit';
import { setTokens, clearTokens } from '../../services/tokenStorage';

const initialState = {
  user: null, // { id, name, email, role, permissions, staffType, status }
  isAuthenticated: false,
  bootstrapping: true, // true until we've checked a stored token against /auth/me once
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsReceived(state, action) {
      const { user, accessToken, refreshToken } = action.payload;
      setTokens({ accessToken, refreshToken });
      state.user = user;
      state.isAuthenticated = true;
      state.bootstrapping = false;
    },
    // Restores session state from a stored access token on page load (e.g.
    // after a refresh) — the token itself is already in localStorage, this
    // just re-populates the in-memory user/permissions from GET /auth/me.
    sessionRestored(state, action) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.bootstrapping = false;
    },
    bootstrapFinished(state) {
      state.bootstrapping = false;
    },
    loggedOut(state) {
      clearTokens();
      state.user = null;
      state.isAuthenticated = false;
      state.bootstrapping = false;
    },
  },
});

export const { credentialsReceived, sessionRestored, bootstrapFinished, loggedOut } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectPermissions = (state) => state.auth.user?.permissions || [];
export const selectIsBootstrapping = (state) => state.auth.bootstrapping;

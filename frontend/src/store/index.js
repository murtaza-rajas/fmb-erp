import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import uiReducer from './uiSlice';

// Redux Toolkit owns client/app state only (auth session, theme, sidebar).
// All server state (data fetched from the API) goes through React Query
// instead — see app/queryClient.js — so there's exactly one cache for
// server data, not two competing ones.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

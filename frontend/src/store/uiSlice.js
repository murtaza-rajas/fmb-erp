import { createSlice } from '@reduxjs/toolkit';

const THEME_KEY = 'fmb_theme_mode';
const storedMode = localStorage.getItem(THEME_KEY);
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const initialState = {
  themeMode: storedMode || (prefersDark ? 'dark' : 'light'),
  sidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    themeToggled(state) {
      state.themeMode = state.themeMode === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, state.themeMode);
    },
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { themeToggled, sidebarToggled } = uiSlice.actions;
export default uiSlice.reducer;

export const selectThemeMode = (state) => state.ui.themeMode;
export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed;

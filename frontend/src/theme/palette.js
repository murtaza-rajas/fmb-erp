// Brand-neutral palette — swap these values for FMB's actual brand colors
// when available. Kept in one file so the swap is a single edit.
export const lightPalette = {
  mode: 'light',
  primary: { main: '#2F5D8A', light: '#5C82A8', dark: '#1E3F5E', contrastText: '#fff' },
  secondary: { main: '#B8863B', light: '#D1A662', dark: '#8C6428', contrastText: '#fff' },
  success: { main: '#2E7D32' },
  warning: { main: '#ED6C02' },
  error: { main: '#C62828' },
  info: { main: '#0277BD' },
  background: { default: '#F4F6F8', paper: '#FFFFFF' },
  text: { primary: '#1A2027', secondary: '#5A6472' },
};

export const darkPalette = {
  mode: 'dark',
  primary: { main: '#6D9BC3', light: '#93B7D6', dark: '#4A7699', contrastText: '#0A1420' },
  secondary: { main: '#D1A662', light: '#E0C088', dark: '#A9803D', contrastText: '#0A1420' },
  success: { main: '#66BB6A' },
  warning: { main: '#FFA726' },
  error: { main: '#EF5350' },
  info: { main: '#4FC3F7' },
  background: { default: '#0F1720', paper: '#182230' },
  text: { primary: '#E7ECF2', secondary: '#9FACBB' },
};

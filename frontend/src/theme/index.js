import { createTheme } from '@mui/material/styles';
import { lightPalette, darkPalette } from './palette';

export function createAppTheme(mode) {
  return createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: ['Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        styleOverrides: { root: { border: '1px solid', borderColor: mode === 'dark' ? '#24303D' : '#E3E8EE' } },
      },
      MuiTableCell: {
        styleOverrides: { head: { fontWeight: 600 } },
      },
    },
  });
}

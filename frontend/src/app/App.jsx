import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createAppTheme } from '../theme';
import { selectThemeMode } from '../store/uiSlice';
import { sessionRestored, bootstrapFinished } from '../features/auth/authSlice';
import { getAccessToken } from '../services/tokenStorage';
import { connectSocket, disconnectSocket } from '../services/socketClient';
import axiosClient from '../services/axiosClient';
import AppRoutes from '../routes/AppRoutes';

export default function App() {
  const themeMode = useSelector(selectThemeMode);
  const dispatch = useDispatch();
  const theme = createAppTheme(themeMode);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getAccessToken();
      if (!token) {
        dispatch(bootstrapFinished());
        return;
      }
      try {
        const { data } = await axiosClient.get('/auth/me');
        if (!cancelled) {
          dispatch(sessionRestored(data.data));
          connectSocket();
        }
      } catch {
        if (!cancelled) dispatch(bootstrapFinished());
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <AppRoutes />
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

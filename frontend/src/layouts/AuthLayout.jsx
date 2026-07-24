import { Outlet } from 'react-router-dom';
import { Box, Paper, Stack, Typography } from '@mui/material';

export default function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 420, p: 4 }}>
        <Stack spacing={0.5} sx={{ mb: 3 }} alignItems="center">
          <Typography variant="h5" fontWeight={700} color="primary.main">
            FMB ERP
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Procurement &amp; Payment Management
          </Typography>
        </Stack>
        <Outlet />
      </Paper>
    </Box>
  );
}

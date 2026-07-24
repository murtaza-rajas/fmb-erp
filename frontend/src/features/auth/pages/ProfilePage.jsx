import { useSelector } from 'react-redux';
import { Card, CardContent, Stack, Avatar, Typography, Chip, Tabs, Tab, Box } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import { selectCurrentUser } from '../authSlice';

export default function ProfilePage() {
  const user = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const location = useLocation();

  const tab = location.pathname.endsWith('/sessions')
    ? 'sessions'
    : location.pathname.endsWith('/change-password')
      ? 'change-password'
      : 'overview';

  return (
    <Box>
      <PageHeader title="My Profile" />
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22 }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6">{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Chip label={user?.role} size="small" color="primary" variant="outlined" />
                <Chip label={user?.staffType === 'paid' ? 'Paid Staff' : 'Khidmat Gujar'} size="small" variant="outlined" />
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => navigate(v === 'overview' ? '/profile' : `/profile/${v}`)} sx={{ mb: 2 }}>
        <Tab label="Overview" value="overview" />
        <Tab label="Change Password" value="change-password" />
        <Tab label="Sessions" value="sessions" />
      </Tabs>

      <Outlet />
    </Box>
  );
}

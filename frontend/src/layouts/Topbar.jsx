import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar, Toolbar, IconButton, Box, Avatar, Menu, MenuItem, ListItemIcon,
  ListItemText, Typography, Divider, Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationBell from '../features/notifications/NotificationBell';
import { selectCurrentUser, loggedOut } from '../features/auth/authSlice';
import { selectThemeMode, themeToggled } from '../store/uiSlice';
import { useLogoutMutation } from '../features/auth/authApi';
import { getRefreshToken } from '../services/tokenStorage';
import { disconnectSocket } from '../services/socketClient';

export default function Topbar({ onMenuClick, onCollapseClick, collapsed }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const user = useSelector(selectCurrentUser);
  const themeMode = useSelector(selectThemeMode);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mutateAsync: logout } = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout(getRefreshToken());
    } catch {
      // Ignore — we clear local state regardless of whether the server call succeeds.
    }
    disconnectSocket();
    dispatch(loggedOut());
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: '1px solid', borderColor: 'divider', zIndex: (t) => t.zIndex.drawer + 1 }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton edge="start" onClick={onMenuClick} sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
          <MenuIcon />
        </IconButton>
        <IconButton edge="start" onClick={onCollapseClick} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
          {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton color="inherit" onClick={() => dispatch(themeToggled())} aria-label="toggle theme">
            {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>

        <NotificationBell />

        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }} aria-label="account menu">
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 240 } }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" noWrap>{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{user?.email}</Typography>
            <Typography variant="caption" color="primary.main" display="block">{user?.role}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
            <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile/change-password'); }}>
            <ListItemIcon><LockOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Change Password</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile/sessions'); }}>
            <ListItemIcon><DevicesOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Sessions</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

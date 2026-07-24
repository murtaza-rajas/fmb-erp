import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Toolbar } from '@mui/material';
import Sidebar, { DRAWER_WIDTH, COLLAPSED_WIDTH } from './Sidebar';
import Topbar from './Topbar';
import Breadcrumbs from './Breadcrumbs';
import { selectSidebarCollapsed, sidebarToggled } from '../store/uiSlice';

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSelector(selectSidebarCollapsed);
  const dispatch = useDispatch();

  // MUI's permanent Drawer renders its Paper with position: fixed, so it
  // never actually participates in flexbox layout (it doesn't push
  // siblings despite this Box being display:flex) — the main content's
  // left margin has to be set explicitly to match the drawer width, or it
  // renders full-width underneath the fixed sidebar.
  const marginLeft = { xs: 0, md: `${collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH}px` };

  return (
    <Box sx={{ display: 'flex' }}>
      <Topbar
        onMenuClick={() => setMobileOpen(true)}
        onCollapseClick={() => dispatch(sidebarToggled())}
        collapsed={collapsed}
      />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: 'background.default',
          minHeight: '100vh',
          ml: marginLeft,
          transition: 'margin-left 0.2s',
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Breadcrumbs />
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Collapse, Typography, Toolbar,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { navConfig } from './navConfig';
import { usePermission } from '../hooks/usePermission';

export const DRAWER_WIDTH = 260;
export const COLLAPSED_WIDTH = 72;

function NavGroup({ item, collapsed }) {
  const location = useLocation();
  const hasPermission = usePermission(item.permission || []);
  const childActive = item.children?.some((c) => location.pathname.startsWith(c.path));
  const [open, setOpen] = useState(Boolean(childActive));

  if (item.permission && !hasPermission) return null;

  if (!item.children) {
    return (
      <ListItemButton component={NavLink} to={item.path} sx={navLinkSx}>
        <ListItemIcon sx={{ minWidth: 40 }}>
          <item.icon fontSize="small" />
        </ListItemIcon>
        {!collapsed && <ListItemText primary={item.label} />}
      </ListItemButton>
    );
  }

  return (
    <>
      <ListItemButton onClick={() => setOpen((o) => !o)} sx={{ borderRadius: 1.5, mx: 1 }}>
        <ListItemIcon sx={{ minWidth: 40 }}>
          <item.icon fontSize="small" />
        </ListItemIcon>
        {!collapsed && (
          <>
            <ListItemText primary={item.label} />
            {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </>
        )}
      </ListItemButton>
      {!collapsed && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child) => (
              <ChildLink key={child.path} child={child} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

function ChildLink({ child }) {
  const hasPermission = usePermission(child.permission || []);
  if (child.permission && !hasPermission) return null;

  return (
    <ListItemButton component={NavLink} to={child.path} sx={{ ...navLinkSx, pl: 6.5 }}>
      <ListItemText primary={child.label} primaryTypographyProps={{ variant: 'body2' }} />
    </ListItemButton>
  );
}

const navLinkSx = {
  borderRadius: 1.5,
  mx: 1,
  mb: 0.25,
  '&.active': {
    bgcolor: 'action.selected',
    fontWeight: 600,
  },
};

export default function Sidebar({ mobileOpen, onClose, collapsed }) {
  const width = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  const content = (
    <Box sx={{ width, transition: 'width 0.2s', overflowX: 'hidden' }}>
      <Toolbar sx={{ px: 2 }}>
        {!collapsed && (
          <Typography variant="h6" fontWeight={700} color="primary.main" noWrap>
            FMB ERP
          </Typography>
        )}
      </Toolbar>
      <List sx={{ py: 1 }}>
        {navConfig.map((item) => (
          <NavGroup key={item.label} item={item} collapsed={collapsed} />
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        {content}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width, transition: 'width 0.2s', overflowX: 'hidden', borderRight: '1px solid', borderColor: 'divider' },
        }}
        open
      >
        {content}
      </Drawer>
    </>
  );
}

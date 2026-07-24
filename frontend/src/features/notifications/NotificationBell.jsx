import { useEffect, useState } from 'react';
import {
  IconButton, Badge, Menu, MenuItem, Typography, Box, Divider, Button, ListItemText, Tooltip,
} from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../services/socketClient';
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from './notificationsApi';

dayjs.extend(relativeTime);

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useListNotificationsQuery({ page: 1, limit: 10 });
  const notifications = data?.items || [];
  const meta = data?.meta;
  const { mutate: markRead } = useMarkNotificationReadMutation();
  const { mutate: markAllRead } = useMarkAllNotificationsReadMutation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [queryClient]);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="notifications">
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 380, maxHeight: 480 } }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={() => markAllRead()}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        )}
        {notifications.map((n) => (
          <MenuItem
            key={n._id}
            onClick={() => !n.isRead && markRead(n._id)}
            sx={{ whiteSpace: 'normal', alignItems: 'flex-start', bgcolor: n.isRead ? 'transparent' : 'action.hover' }}
          >
            <ListItemText
              primary={n.title}
              secondary={
                <>
                  <Typography variant="body2" color="text.secondary" component="span" display="block">
                    {n.message}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {dayjs(n.createdAt).fromNow()}
                  </Typography>
                </>
              }
            />
          </MenuItem>
        ))}
        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button
            size="small"
            onClick={() => {
              setAnchorEl(null);
              navigate('/notifications');
            }}
          >
            {meta?.total > notifications.length ? `View all (${meta.total})` : 'View all'}
          </Button>
        </Box>
      </Menu>
    </>
  );
}

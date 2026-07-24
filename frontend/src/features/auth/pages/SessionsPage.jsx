import { useState } from 'react';
import {
  List, ListItem, ListItemText, IconButton, Card, Typography, CircularProgress,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionsQuery, useRevokeSessionMutation } from '../authApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';

export default function SessionsPage() {
  const { data: sessions, isLoading, isError, error, refetch } = useSessionsQuery();
  const { mutateAsync: revoke, isPending } = useRevokeSessionMutation();
  const [target, setTarget] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const handleRevoke = async () => {
    await revoke(target._id);
    queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    enqueueSnackbar('Session revoked', { variant: 'success' });
    setTarget(null);
  };

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <Card variant="outlined">
      {sessions.length === 0 ? (
        <EmptyState title="No active sessions" />
      ) : (
        <List disablePadding>
          {sessions.map((s) => (
            <ListItem
              key={s._id}
              divider
              secondaryAction={
                <IconButton edge="end" onClick={() => setTarget(s)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={s.deviceInfo || 'Unknown device'}
                secondary={
                  <>
                    <Typography variant="caption" color="text.secondary" display="block">IP: {s.ip || 'unknown'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Signed in {dayjs(s.createdAt).format('DD MMM YYYY, HH:mm')} · expires {dayjs(s.expiresAt).format('DD MMM YYYY')}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={handleRevoke}
        loading={isPending}
        title="Revoke session"
        description="This will sign out that device immediately."
        confirmLabel="Revoke"
        confirmColor="error"
      />
    </Card>
  );
}

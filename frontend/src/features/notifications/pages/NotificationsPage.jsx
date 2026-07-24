import { useMemo, useState } from 'react';
import { Button, Chip, FormControlLabel, Switch, IconButton, Tooltip } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../notificationsApi';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, isError, error, refetch } = useListNotificationsQuery({
    page,
    limit,
    ...(unreadOnly ? { unreadOnly: true } : {}),
  });
  const { mutate: markRead } = useMarkNotificationReadMutation();
  const { mutateAsync: markAllRead, isPending: markingAll } = useMarkAllNotificationsReadMutation();

  const columns = useMemo(
    () => [
      { header: 'Title', accessorKey: 'title' },
      { header: 'Message', accessorKey: 'message' },
      { header: 'Channel', accessorKey: 'channel', cell: (info) => <span style={{ textTransform: 'capitalize' }}>{info.getValue()?.replace('_', ' ')}</span> },
      {
        header: 'Status',
        accessorKey: 'isRead',
        cell: (info) => (info.getValue() ? <Chip size="small" label="Read" /> : <Chip size="small" color="primary" label="Unread" />),
      },
      { header: 'Received', accessorKey: 'sentAt', cell: (info) => dayjs(info.getValue() || info.row.original.createdAt).format('DD MMM YYYY, HH:mm') },
      {
        header: '',
        id: 'actions',
        cell: (info) =>
          !info.row.original.isRead && (
            <Tooltip title="Mark as read">
              <IconButton size="small" onClick={() => markRead(info.row.original._id)}>
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ),
      },
    ],
    [markRead]
  );

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="All notifications sent to your account"
        actions={
          <Button variant="outlined" startIcon={<DoneAllIcon />} disabled={markingAll} onClick={() => markAllRead()}>
            Mark all as read
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No notifications"
        getRowId={(row) => row._id}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
        toolbarActions={
          <FormControlLabel
            control={<Switch checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />}
            label="Unread only"
          />
        }
      />
    </>
  );
}

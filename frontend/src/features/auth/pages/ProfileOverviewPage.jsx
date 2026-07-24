import { useSelector } from 'react-redux';
import { Card, CardContent, Grid, Typography } from '@mui/material';
import { selectCurrentUser } from '../authSlice';

function Field({ label, value }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value || '—'}</Typography>
    </Grid>
  );
}

export default function ProfileOverviewPage() {
  const user = useSelector(selectCurrentUser);

  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={3}>
          <Field label="Name" value={user?.name} />
          <Field label="Email" value={user?.email} />
          <Field label="Role" value={user?.role} />
          <Field label="Staff Type" value={user?.staffType === 'paid' ? 'Paid Staff' : 'Khidmat Gujar'} />
          <Field label="Status" value={user?.status} />
        </Grid>
      </CardContent>
    </Card>
  );
}

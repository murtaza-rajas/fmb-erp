import { Card, CardContent, Stack, Typography, Box, Skeleton } from '@mui/material';

export default function StatCard({ label, value, subValue, icon: Icon, color = 'primary', loading }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            {loading ? (
              <Skeleton width={80} height={36} />
            ) : (
              <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>{value}</Typography>
            )}
            {subValue && !loading && (
              <Typography variant="caption" color="text.secondary">{subValue}</Typography>
            )}
          </Box>
          {Icon && (
            <Box sx={{ bgcolor: `${color}.main`, color: `${color}.contrastText`, borderRadius: 2, p: 1, display: 'flex', opacity: 0.9 }}>
              <Icon />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

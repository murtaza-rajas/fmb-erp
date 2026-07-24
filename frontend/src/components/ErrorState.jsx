import { Alert, AlertTitle, Button, Stack } from '@mui/material';

export default function ErrorState({ error, onRetry }) {
  const message = error?.response?.data?.error?.message || error?.message || 'Something went wrong';

  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      <AlertTitle>Failed to load</AlertTitle>
      <Stack spacing={0.5}>{message}</Stack>
    </Alert>
  );
}

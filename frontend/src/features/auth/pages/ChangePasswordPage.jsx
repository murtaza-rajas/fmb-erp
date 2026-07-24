import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Card, CardContent, Stack, Button, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import { changePasswordSchema } from '../authValidation';
import { useChangePasswordMutation } from '../authApi';

export default function ChangePasswordPage() {
  const methods = useForm({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { mutateAsync, isPending, error } = useChangePasswordMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Password changed successfully', { variant: 'success' });
      methods.reset();
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 480 }}>
      <CardContent>
        <FormProvider {...methods}>
          <Stack component="form" spacing={2.5} onSubmit={methods.handleSubmit(onSubmit)} noValidate>
            {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to change password'}</Alert>}
            <FormTextField name="currentPassword" label="Current Password" type="password" />
            <FormTextField name="newPassword" label="New Password" type="password" />
            <FormTextField name="confirmPassword" label="Confirm New Password" type="password" />
            <Button type="submit" variant="contained" disabled={isPending} sx={{ alignSelf: 'flex-start' }}>
              {isPending ? <CircularProgress size={22} color="inherit" /> : 'Change Password'}
            </Button>
          </Stack>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

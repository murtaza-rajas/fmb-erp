import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Stack, Button, Alert, CircularProgress, Link } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import { resetPasswordSchema } from '../authValidation';
import { useResetPasswordMutation } from '../authApi';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const methods = useForm({ resolver: yupResolver(resetPasswordSchema), defaultValues: { newPassword: '', confirmPassword: '' } });
  const { mutateAsync, isPending, error } = useResetPasswordMutation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  if (!token) {
    return <Alert severity="error">This reset link is missing its token. Please request a new one.</Alert>;
  }

  const onSubmit = async (values) => {
    try {
      await mutateAsync({ token, newPassword: values.newPassword });
      enqueueSnackbar('Password reset — please sign in', { variant: 'success' });
      navigate('/login', { replace: true });
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <FormProvider {...methods}>
      <Stack component="form" spacing={2.5} onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        {error && <Alert severity="error">{error.response?.data?.error?.message || 'Reset failed — the link may have expired'}</Alert>}
        <FormTextField name="newPassword" label="New Password" type="password" autoFocus />
        <FormTextField name="confirmPassword" label="Confirm New Password" type="password" />
        <Button type="submit" variant="contained" size="large" disabled={isPending}>
          {isPending ? <CircularProgress size={22} color="inherit" /> : 'Reset Password'}
        </Button>
        <Link component={RouterLink} to="/login" variant="body2" sx={{ alignSelf: 'center' }}>
          Back to sign in
        </Link>
      </Stack>
    </FormProvider>
  );
}

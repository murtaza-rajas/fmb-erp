import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useDispatch } from 'react-redux';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { Stack, Button, Link, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import { loginSchema } from '../authValidation';
import { useLoginMutation } from '../authApi';
import { credentialsReceived } from '../authSlice';
import { connectSocket } from '../../../services/socketClient';

export default function LoginPage() {
  const methods = useForm({ resolver: yupResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { mutateAsync, isPending, error } = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      const data = await mutateAsync(values);
      dispatch(credentialsReceived(data));
      connectSocket();
      enqueueSnackbar(`Welcome back, ${data.user.name}`, { variant: 'success' });
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch {
      // error state is already surfaced below via the mutation's `error`
    }
  };

  return (
    <FormProvider {...methods}>
      <Stack component="form" spacing={2.5} onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        {error && <Alert severity="error">{error.response?.data?.error?.message || 'Login failed'}</Alert>}
        <FormTextField name="email" label="Email" autoComplete="username" autoFocus />
        <FormTextField name="password" label="Password" type="password" autoComplete="current-password" />
        <Stack direction="row" justifyContent="flex-end">
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Forgot password?
          </Link>
        </Stack>
        <Button type="submit" variant="contained" size="large" disabled={isPending}>
          {isPending ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
        </Button>
      </Stack>
    </FormProvider>
  );
}

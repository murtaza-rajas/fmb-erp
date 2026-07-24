import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link as RouterLink } from 'react-router-dom';
import { Stack, Button, Link, Alert, CircularProgress, Typography } from '@mui/material';
import FormTextField from '../../../components/form/FormTextField';
import { forgotPasswordSchema } from '../authValidation';
import { useForgotPasswordMutation } from '../authApi';

export default function ForgotPasswordPage() {
  const methods = useForm({ resolver: yupResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const { mutateAsync, isPending } = useForgotPasswordMutation();
  const [sent, setSent] = useState(false);

  const onSubmit = async (values) => {
    await mutateAsync(values.email);
    setSent(true);
  };

  if (sent) {
    return (
      <Stack spacing={2}>
        <Alert severity="success">If that email exists, a reset link has been sent.</Alert>
        <Link component={RouterLink} to="/login" variant="body2">
          Back to sign in
        </Link>
      </Stack>
    );
  }

  return (
    <FormProvider {...methods}>
      <Stack component="form" spacing={2.5} onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        <Typography variant="body2" color="text.secondary">
          Enter your account email and we'll send you a password reset link.
        </Typography>
        <FormTextField name="email" label="Email" autoFocus />
        <Button type="submit" variant="contained" size="large" disabled={isPending}>
          {isPending ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
        </Button>
        <Link component={RouterLink} to="/login" variant="body2" sx={{ alignSelf: 'center' }}>
          Back to sign in
        </Link>
      </Stack>
    </FormProvider>
  );
}

import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Card, CardContent, Stack, Button, CircularProgress, Grid, Alert } from '@mui/material';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../components/PageHeader';
import FormTextField from '../../../components/form/FormTextField';
import FormCheckbox from '../../../components/form/FormCheckbox';
import { useSystemSettingsQuery, useUpdateSystemSettingsMutation } from '../settingsApi';

const schema = yup.object({
  latestVersion: yup.string().nullable(),
  minSupportedVersion: yup.string().nullable(),
  forceUpdate: yup.boolean(),
  maintenanceMode: yup.boolean(),
  maintenanceMessage: yup.string().nullable(),
  backupScheduleCron: yup.string().nullable(),
});

export default function SystemSettingsPage() {
  const { data, isLoading } = useSystemSettingsQuery();
  const { mutateAsync, isPending } = useUpdateSystemSettingsMutation();
  const { enqueueSnackbar } = useSnackbar();

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      latestVersion: '',
      minSupportedVersion: '',
      forceUpdate: false,
      maintenanceMode: false,
      maintenanceMessage: '',
      backupScheduleCron: '',
    },
  });

  const maintenanceMode = methods.watch('maintenanceMode');

  useEffect(() => {
    if (data) {
      methods.reset({
        latestVersion: data.latestVersion || '',
        minSupportedVersion: data.minSupportedVersion || '',
        forceUpdate: Boolean(data.forceUpdate),
        maintenanceMode: Boolean(data.maintenanceMode),
        maintenanceMessage: data.maintenanceMessage || '',
        backupScheduleCron: data.backupScheduleCron || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('System settings updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update system settings', { variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="System Settings" subtitle="Mobile app version gating and maintenance mode" />
      <Card variant="outlined" sx={{ maxWidth: 720 }}>
        <CardContent>
          <FormProvider {...methods}>
            <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate spacing={2.5}>
              {maintenanceMode && <Alert severity="warning">Maintenance mode is enabled — the mobile app will show the maintenance message to all users.</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormTextField name="latestVersion" label="Latest App Version" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField name="minSupportedVersion" label="Minimum Supported Version" />
                </Grid>
              </Grid>
              <FormCheckbox name="forceUpdate" label="Force update (block app below minimum version)" />
              <FormCheckbox name="maintenanceMode" label="Maintenance mode" />
              <FormTextField name="maintenanceMessage" label="Maintenance Message" multiline rows={2} />
              <FormTextField name="backupScheduleCron" label="Backup Schedule (cron expression)" />
              <Box>
                <Button type="submit" variant="contained" disabled={isPending}>
                  {isPending ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
                </Button>
              </Box>
            </Stack>
          </FormProvider>
        </CardContent>
      </Card>
    </Box>
  );
}

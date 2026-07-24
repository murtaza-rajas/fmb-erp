import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Card, CardContent, Stack, Button, CircularProgress, Grid } from '@mui/material';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../components/PageHeader';
import FormTextField from '../../../components/form/FormTextField';
import { optionalNumber } from '../../../utils/yupHelpers';
import { useCompanySettingsQuery, useUpdateCompanySettingsMutation } from '../settingsApi';

const schema = yup.object({
  name: yup.string().required('Company name is required'),
  logoUrl: yup.string().nullable(),
  address: yup.string().nullable(),
  gstin: yup.string().nullable(),
  financialYearStartMonth: optionalNumber().min(1, 'Must be 1–12').max(12, 'Must be 1–12'),
  currency: yup.string().nullable(),
});

export default function CompanySettingsPage() {
  const { data, isLoading } = useCompanySettingsQuery();
  const { mutateAsync, isPending } = useUpdateCompanySettingsMutation();
  const { enqueueSnackbar } = useSnackbar();

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', logoUrl: '', address: '', gstin: '', financialYearStartMonth: '', currency: '' },
  });

  useEffect(() => {
    if (data) {
      methods.reset({
        name: data.name || '',
        logoUrl: data.logoUrl || '',
        address: data.address || '',
        gstin: data.gstin || '',
        financialYearStartMonth: data.financialYearStartMonth ?? '',
        currency: data.currency || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Company settings updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update company settings', { variant: 'error' });
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
      <PageHeader title="Company Settings" subtitle="Organization details used across documents and PDFs" />
      <Card variant="outlined" sx={{ maxWidth: 720 }}>
        <CardContent>
          <FormProvider {...methods}>
            <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate spacing={2.5}>
              <FormTextField name="name" label="Company Name" />
              <FormTextField name="logoUrl" label="Logo URL" />
              <FormTextField name="address" label="Address" multiline rows={2} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormTextField name="gstin" label="GSTIN" />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormTextField name="financialYearStartMonth" label="FY Start Month" type="number" />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormTextField name="currency" label="Currency" />
                </Grid>
              </Grid>
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

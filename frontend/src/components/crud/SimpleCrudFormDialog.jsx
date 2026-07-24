import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import FormTextField from '../form/FormTextField';
import FormSelect from '../form/FormSelect';
import FormCheckbox from '../form/FormCheckbox';

const FIELD_COMPONENTS = { text: FormTextField, number: FormTextField, select: FormSelect, checkbox: FormCheckbox };

export default function SimpleCrudFormDialog({ open, onClose, onSubmit, resourceLabel, fields, schema, editingRow, toFormValues, isPending, error }) {
  const isEdit = Boolean(editingRow);
  const defaultValues = buildDefaultValues(fields);

  const methods = useForm({ resolver: yupResolver(schema), defaultValues });

  useEffect(() => {
    if (open) {
      methods.reset(isEdit ? toFormValues(editingRow) : defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingRow]);

  const handleFormSubmit = async (values) => {
    try {
      await onSubmit(values);
    } catch {
      // surfaced via `error` prop, passed down from the mutation that owns it
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? `Edit ${resourceLabel}` : `New ${resourceLabel}`}</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(handleFormSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || `Failed to save ${resourceLabel.toLowerCase()}`}</Alert>}
              {fields.map((f) => {
                const Field = FIELD_COMPONENTS[f.type] || FormTextField;
                return (
                  <Field
                    key={f.name}
                    name={f.name}
                    label={f.label}
                    type={f.type === 'number' ? 'number' : f.type === 'text' ? 'text' : undefined}
                    options={f.options}
                    autoFocus={f.autoFocus}
                  />
                );
              })}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save Changes' : `Create ${resourceLabel}`}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}

function buildDefaultValues(fields) {
  const defaults = {};
  for (const f of fields) defaults[f.name] = f.type === 'checkbox' ? false : '';
  return defaults;
}

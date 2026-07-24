import { Controller, useFormContext } from 'react-hook-form';
import { TextField } from '@mui/material';

// Every form in the app uses react-hook-form's FormProvider + this field
// component, so validation error display is consistent everywhere without
// repeating the Controller boilerplate at each call site.
export default function FormTextField({ name, label, type = 'text', multiline, rows, ...rest }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label}
          type={type}
          multiline={multiline}
          rows={rows}
          fullWidth
          size="small"
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
          {...rest}
        />
      )}
    />
  );
}

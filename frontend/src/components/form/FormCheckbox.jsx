import { Controller, useFormContext } from 'react-hook-form';
import { FormControlLabel, Checkbox } from '@mui/material';

export default function FormCheckbox({ name, label }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel control={<Checkbox {...field} checked={Boolean(field.value)} />} label={label} />
      )}
    />
  );
}

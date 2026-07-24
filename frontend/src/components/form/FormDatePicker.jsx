import { Controller, useFormContext } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

export default function FormDatePicker({ name, label, ...rest }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <DatePicker
          label={label}
          value={field.value ? dayjs(field.value) : null}
          onChange={(newValue) => {
            // MUI fires onChange on every keystroke of a typed date (sectioned
            // input) — intermediate values are a truthy but invalid Dayjs
            // object until all sections are filled in, so toISOString() must
            // be guarded rather than called on anything non-null.
            if (!newValue) return field.onChange(null);
            if (!newValue.isValid()) return; // wait for a complete, valid date
            field.onChange(newValue.toISOString());
          }}
          slotProps={{
            textField: {
              name,
              fullWidth: true,
              size: 'small',
              error: Boolean(fieldState.error),
              helperText: fieldState.error?.message,
            },
          }}
          {...rest}
        />
      )}
    />
  );
}

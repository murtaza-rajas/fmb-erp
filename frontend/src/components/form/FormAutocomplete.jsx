import { Controller, useFormContext } from 'react-hook-form';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';

// For picking an entity by name (item, vendor, store, role...) where options
// come from a React Query-backed list. `options` is [{ value, label }].
// Pass `multiple` for a multi-select field (e.g. Vendor.itemsSupplied) — the
// field value becomes an array of `value`s instead of a single one.
export default function FormAutocomplete({ name, label, options, loading, onInputChange, multiple, ...rest }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          multiple={multiple}
          options={options}
          loading={loading}
          getOptionLabel={(opt) => opt.label || ''}
          isOptionEqualToValue={(opt, val) => opt.value === val?.value}
          value={
            multiple
              ? options.filter((o) => (field.value || []).includes(o.value))
              : options.find((o) => o.value === field.value) || null
          }
          onChange={(_, newValue) =>
            field.onChange(multiple ? newValue.map((v) => v.value) : newValue ? newValue.value : '')
          }
          onInputChange={(_, newInput) => onInputChange?.(newInput)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              size="small"
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          {...rest}
        />
      )}
    />
  );
}

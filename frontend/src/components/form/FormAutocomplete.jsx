import { Controller, useFormContext } from 'react-hook-form';
import { Autocomplete, TextField, CircularProgress, Box, createFilterOptions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const ADD_NEW_VALUE = '__add_new__';
const defaultFilter = createFilterOptions();

// For picking an entity by name (item, vendor, store, role...) where options
// come from a React Query-backed list. `options` is [{ value, label }].
// Pass `multiple` for a multi-select field (e.g. Vendor.itemsSupplied) — the
// field value becomes an array of `value`s instead of a single one.
// Pass `onAddNew` (single-select only) to prepend a "+ Add new" option that
// triggers the callback instead of being selected — the caller is
// responsible for opening a create dialog and setting the field value itself.
// It's pinned to the top and kept visible regardless of the search text (a
// plain option would otherwise be filtered out of the list once the user
// types anything that doesn't match its own label).
export default function FormAutocomplete({ name, label, options, loading, onInputChange, multiple, onAddNew, addNewLabel, ...rest }) {
  const { control } = useFormContext();
  const addNewOption = { value: ADD_NEW_VALUE, label: addNewLabel || '+ Add New' };
  const allOptions = onAddNew && !multiple ? [addNewOption, ...options] : options;
  const filterOptions = onAddNew && !multiple
    ? (opts, state) => [addNewOption, ...defaultFilter(opts.filter((o) => o.value !== ADD_NEW_VALUE), state)]
    : undefined;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          multiple={multiple}
          options={allOptions}
          filterOptions={filterOptions}
          loading={loading}
          getOptionLabel={(opt) => opt.label || ''}
          isOptionEqualToValue={(opt, val) => opt.value === val?.value}
          value={
            multiple
              ? options.filter((o) => (field.value || []).includes(o.value))
              : options.find((o) => o.value === field.value) || null
          }
          onChange={(_, newValue) => {
            if (!multiple && newValue?.value === ADD_NEW_VALUE) {
              onAddNew();
              return;
            }
            field.onChange(multiple ? newValue.map((v) => v.value) : newValue ? newValue.value : '');
          }}
          onInputChange={(_, newInput) => onInputChange?.(newInput)}
          renderOption={
            onAddNew
              ? (props, option) =>
                  option.value === ADD_NEW_VALUE ? (
                    <Box component="li" {...props} sx={{ color: 'primary.main', fontWeight: 500 }}>
                      <AddIcon fontSize="small" sx={{ mr: 1 }} />
                      {option.label}
                    </Box>
                  ) : (
                    <Box component="li" {...props}>{option.label}</Box>
                  )
              : undefined
          }
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

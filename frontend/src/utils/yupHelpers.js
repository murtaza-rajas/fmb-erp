import * as yup from 'yup';

// yup.number() casts '' to NaN and fails typeError even when the field is
// .nullable()/not required — an MUI number TextField's empty state IS ''
// (not undefined), so every "optional number" field needs this transform or
// leaving it blank silently blocks submission with no visible error and no
// network call (confirmed live: a blank "Rate" field on the PO form did
// exactly this). Use in place of yup.number() for any optional numeric field.
export function optionalNumber() {
  return yup
    .number()
    .transform((value, originalValue) => (String(originalValue).trim() === '' ? undefined : value))
    .nullable();
}

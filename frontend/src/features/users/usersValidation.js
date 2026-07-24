import * as yup from 'yup';

export const createUserSchema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  roleId: yup.string().required('Role is required'),
  staffType: yup.string().oneOf(['paid', 'khidmat_gujar']).required('Staff type is required'),
  phone: yup.string().nullable(),
});

export const updateUserSchema = yup.object({
  name: yup.string().required('Name is required'),
  phone: yup.string().nullable(),
});

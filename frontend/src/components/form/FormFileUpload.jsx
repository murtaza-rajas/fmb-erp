import { useState } from 'react';
import axios from 'axios';
import { Controller, useFormContext } from 'react-hook-form';
import { Stack, Button, Typography, CircularProgress, Link } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import axiosClient from '../../services/axiosClient';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// Direct-to-S3 presigned upload (see docs/architecture/api-design.md § Uploads).
// The presign request goes through axiosClient (needs auth), but the actual
// file PUT goes straight to S3 with plain axios — it must not carry our
// Authorization header or baseURL, and the presigned URL's own query-string
// signature is the only auth it needs.
export default function FormFileUpload({ name, label, module }) {
  const { control, setValue } = useFormContext();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event, onChange) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, or PDF files are allowed');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const { data } = await axiosClient.post('/uploads/presign', {
        module,
        fileName: file.name,
        contentType: file.type,
      });
      const { uploadUrl, fileKey } = data.data;

      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });

      onChange(fileKey);
      setValue(name, fileKey, { shouldDirty: true });
    } catch {
      setError('Upload failed — please try again');
    } finally {
      setUploading(false);
    }
  };

  const handleViewCurrent = async (fileKey) => {
    const { data } = await axiosClient.get('/uploads/view-url', { params: { fileKey } });
    window.open(data.data.viewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              component="label"
              variant="outlined"
              size="small"
              startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileOutlinedIcon />}
              disabled={uploading}
            >
              {value ? 'Replace File' : 'Upload File'}
              <input
                type="file"
                hidden
                accept={ALLOWED_CONTENT_TYPES.join(',')}
                onChange={(e) => handleFileChange(e, onChange)}
              />
            </Button>
            {value && (
              <Link component="button" type="button" variant="body2" onClick={() => handleViewCurrent(value)}>
                View current file
              </Link>
            )}
          </Stack>
          {error && <Typography variant="caption" color="error">{error}</Typography>}
        </Stack>
      )}
    />
  );
}

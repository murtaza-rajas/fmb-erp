import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useSnackbar } from 'notistack';

// Generic "pick .xlsx file -> submit -> show result" dialog, shared across
// masters that support bulk import (Vendors, Items). `useImportMutation` is
// the feature-specific React Query hook (e.g. useImportVendorsMutation) —
// this component stays dumb about the endpoint/query-key details.
export default function ImportExcelDialog({ open, onClose, title, useImportMutation, entityLabel = 'records' }) {
  const [file, setFile] = useState(null);
  const { mutateAsync: importFile, isPending, error, reset } = useImportMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleClose = () => {
    setFile(null);
    reset();
    onClose();
  };

  const handleFileChange = (event) => {
    reset();
    setFile(event.target.files?.[0] || null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await importFile(formData);
      const { totalRows, created, updated, categorization } = result || {};
      enqueueSnackbar(
        `Imported: ${created ?? 0} created, ${updated ?? 0} updated (${totalRows ?? 0} rows processed)`,
        { variant: 'success' }
      );
      if (Array.isArray(categorization) && categorization.length > 0) {
        enqueueSnackbar('Categories were auto-assigned — review them on the Items page', { variant: 'info' });
      }
      setFile(null);
      onClose();
    } catch {
      // surfaced via error state below
    }
  };

  const details = error?.response?.data?.error?.details;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {error && (
            <Alert severity="error">{error.response?.data?.error?.message || `Failed to import ${entityLabel}`}</Alert>
          )}
          {Array.isArray(details) && details.length > 0 && (
            <List dense sx={{ maxHeight: 220, overflowY: 'auto', bgcolor: 'action.hover', borderRadius: 1 }}>
              {details.map((d, idx) => (
                <ListItem key={idx} sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={d.row != null ? `Row ${d.row}: ${d.message}` : d.message}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            Choose File
            <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
          </Button>
          {file && (
            <Typography variant="body2" color="text.secondary">
              Selected: {file.name}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!file || isPending}>
          {isPending ? <CircularProgress size={20} color="inherit" /> : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import { ButtonGroup, Button, CircularProgress } from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { useSnackbar } from 'notistack';
import { usePermission } from '../../../hooks/usePermission';
import { downloadReportExport } from '../reportsApi';

const FORMATS = [
  { format: 'csv', label: 'CSV' },
  { format: 'excel', label: 'Excel' },
  { format: 'pdf', label: 'PDF' },
];

export default function ExportButtons({ endpoint, params, filename }) {
  const canExport = usePermission('report:export');
  const [pending, setPending] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  if (!canExport) return null;

  const handleExport = async (format) => {
    setPending(format);
    try {
      await downloadReportExport(endpoint, format, params, filename);
    } catch {
      enqueueSnackbar('Failed to export report', { variant: 'error' });
    } finally {
      setPending(null);
    }
  };

  return (
    <ButtonGroup variant="outlined" size="small">
      {FORMATS.map(({ format, label }) => (
        <Button key={format} onClick={() => handleExport(format)} disabled={Boolean(pending)} startIcon={pending === format ? <CircularProgress size={14} /> : <DownloadOutlinedIcon />}>
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

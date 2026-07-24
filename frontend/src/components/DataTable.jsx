import { useState, useRef } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination, Paper, TextField, InputAdornment,
  Box, Skeleton, Toolbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

// A single server-side-paginated table used across every list page in the
// app — columns follow @tanstack/react-table's ColumnDef shape. Sorting and
// search are server-side (debounced) since every backend list endpoint
// already supports page/limit/sort/search.
export default function DataTable({
  columns,
  data = [],
  rowCount = 0,
  page,
  limit,
  onPageChange,
  onLimitChange,
  sortField,
  sortDirection,
  onSortChange,
  search,
  onSearchChange,
  isLoading,
  isError,
  error,
  onRetry,
  emptyMessage = 'No records found',
  toolbarActions,
  getRowId,
}) {
  const [searchInput, setSearchInput] = useState(search || '');
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getRowId });

  const searchDebounceRef = useRef(null);
  const handleSearchInput = (value) => {
    setSearchInput(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => onSearchChange?.(value), 400);
  };

  return (
    <Paper variant="outlined">
      <Toolbar sx={{ gap: 2, py: 1.5 }}>
        {onSearchChange && (
          <TextField
            size="small"
            placeholder="Search…"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            sx={{ maxWidth: 280 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        )}
        <Box sx={{ flexGrow: 1 }} />
        {toolbarActions}
      </Toolbar>

      {isError ? (
        <Box sx={{ p: 2 }}>
          <ErrorState error={error} onRetry={onRetry} />
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortKey = header.column.columnDef.meta?.sortKey;
                    return (
                      <TableCell key={header.id}>
                        {sortKey && onSortChange ? (
                          <TableSortLabel
                            active={sortField === sortKey}
                            direction={sortField === sortKey ? sortDirection : 'asc'}
                            onClick={() => onSortChange(sortKey)}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableSortLabel>
                        ) : (
                          !header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((c, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoading && table.getRowModel().rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <EmptyState title={emptyMessage} />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {onPageChange && (
        <TablePagination
          component="div"
          count={rowCount}
          page={Math.max(page - 1, 0)}
          onPageChange={(_, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => onLimitChange?.(Number(e.target.value))}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      )}
    </Paper>
  );
}

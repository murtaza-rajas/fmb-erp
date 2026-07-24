import { useState } from 'react';

// Pairs with DataTable — owns page/limit/sort/search state and produces both
// the query params to send to the API and the props DataTable needs, so a
// list page only has to wire the two together.
export function useTableState({ initialLimit = 20, initialSort = '-createdAt' } = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [sort, setSort] = useState(initialSort);
  const [search, setSearch] = useState('');

  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortDirection = sort.startsWith('-') ? 'desc' : 'asc';

  const handleSortChange = (field) => {
    setSort((current) => {
      if (current === field) return `-${field}`;
      if (current === `-${field}`) return field;
      return field;
    });
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  return {
    queryParams: { page, limit, sort, search: search || undefined },
    tableProps: {
      page,
      limit,
      onPageChange: setPage,
      onLimitChange: (newLimit) => { setLimit(newLimit); setPage(1); },
      sortField,
      sortDirection,
      onSortChange: handleSortChange,
      search,
      onSearchChange: handleSearchChange,
    },
  };
}

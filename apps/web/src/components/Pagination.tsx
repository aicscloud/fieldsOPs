'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';

export const PAGE_SIZE = 10;

export function usePager<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [items, pageSize]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const slice = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return {
    page: safePage,
    setPage,
    pageCount,
    slice,
    total: items.length,
    pageSize,
  };
}

export function Pagination({
  page,
  pageCount,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="pager">
      <span className="muted">
        {total} résultat{total > 1 ? 's' : ''} · page {page + 1}/{pageCount}
      </span>
      <div className="row">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 0}
          onClick={() => onChange(page - 1)}
        >
          Précédent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page + 1 >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

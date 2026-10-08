'use client';

import { ReactNode, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Pagination, usePager } from '@/components/Pagination';

export type SortDir = 'asc' | 'desc';

export type DataColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  /** Valeur utilisée pour le tri (sinon row[key]). */
  sortValue?: (row: T) => string | number | null | undefined | Date;
  render: (row: T) => ReactNode;
  className?: string;
};

type Props<T> = {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: SortDir;
};

function compareValues(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : new Date(String(a)).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(String(b)).getTime();
    return ta - tb;
  }

  if (typeof a === 'number' && typeof b === 'number') return a - b;

  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '') {
    if (String(a).match(/^-?\d+(\.\d+)?$/) && String(b).match(/^-?\d+(\.\d+)?$/)) {
      return na - nb;
    }
  }

  return String(a).localeCompare(String(b), 'fr', {
    numeric: true,
    sensitivity: 'base',
  });
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  empty,
  pageSize = 10,
  defaultSortKey,
  defaultSortDir = 'asc',
}: Props<T>) {
  const initialKey =
    defaultSortKey && columns.some((c) => c.key === defaultSortKey && c.sortable !== false)
      ? defaultSortKey
      : columns.find((c) => c.sortable !== false)?.key ?? null;

  const [sortKey, setSortKey] = useState<string | null>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || col.sortable === false) return rows;

    const copy = [...rows];
    copy.sort((ra, rb) => {
      const va = col.sortValue
        ? col.sortValue(ra)
        : (ra as Record<string, unknown>)[col.key];
      const vb = col.sortValue
        ? col.sortValue(rb)
        : (rb as Record<string, unknown>)[col.key];
      const cmp = compareValues(va, vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  const pager = usePager(sorted, pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }

  if (!rows.length) {
    return <>{empty ?? null}</>;
  }

  return (
    <div className="datatable">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => {
                const sortable = col.sortable !== false;
                const active = sortKey === col.key;
                return (
                  <th key={col.key} className={col.className}>
                    {sortable ? (
                      <button
                        type="button"
                        className={`datatable-sort ${active ? 'is-active' : ''}`}
                        onClick={() => toggleSort(col.key)}
                      >
                        <span>{col.header}</span>
                        {active ? (
                          sortDir === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'is-clickable' : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        onChange={pager.setPage}
      />
    </div>
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react';

export type SearchOption = {
  value: string;
  label: string;
  meta?: string;
};

type Props = {
  value: string;
  onChange: (value: string, option?: SearchOption | null) => void;
  /** Charge max ~10 options. Appelé à l’ouverture et à chaque recherche. */
  loadOptions: (query: string) => Promise<SearchOption[]>;
  label?: string;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  /** Libellé affiché si la valeur n’est pas dans la liste courante. */
  selectedLabel?: string;
  /** Options locales (pas d’API) — filtrées côté client, max 10 affichées. */
  staticOptions?: SearchOption[];
};

const LIMIT = 10;

export function SearchSelect({
  value,
  onChange,
  loadOptions,
  label,
  placeholder = 'Rechercher…',
  emptyLabel = 'Aucun résultat',
  disabled,
  required,
  allowClear = true,
  selectedLabel,
  staticOptions,
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [display, setDisplay] = useState(selectedLabel ?? '');

  useEffect(() => {
    if (selectedLabel) setDisplay(selectedLabel);
    else if (!value) setDisplay('');
  }, [selectedLabel, value]);

  const fetchOptions = useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        if (staticOptions) {
          const needle = query.trim().toLowerCase();
          const filtered = needle
            ? staticOptions.filter(
                (o) =>
                  o.label.toLowerCase().includes(needle) ||
                  (o.meta ?? '').toLowerCase().includes(needle),
              )
            : staticOptions;
          setOptions(filtered.slice(0, LIMIT));
        } else {
          const rows = await loadOptions(query.trim());
          setOptions(rows.slice(0, LIMIT));
        }
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions, staticOptions],
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void fetchOptions(q), q ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [open, q, fetchOptions]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function pick(opt: SearchOption) {
    onChange(opt.value, opt);
    setDisplay(opt.label);
    setOpen(false);
    setQ('');
  }

  function clear(e: MouseEvent) {
    e.stopPropagation();
    onChange('', null);
    setDisplay('');
    setQ('');
  }

  return (
    <div className={`search-select ${disabled ? 'is-disabled' : ''}`} ref={rootRef}>
      {label ? (
        <label className="field" htmlFor={id}>
          <span>
            {label}
            {required ? ' *' : ''}
          </span>
        </label>
      ) : null}
      <button
        id={id}
        type="button"
        className="search-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
      >
        <span className={display ? '' : 'muted'}>{display || placeholder}</span>
        <span className="search-select-actions">
          {allowClear && value ? (
            <X size={14} onClick={clear} aria-label="Effacer" />
          ) : null}
          <ChevronsUpDown size={14} />
        </span>
      </button>
      {open ? (
        <div className="search-select-panel" role="listbox">
          <div className="search-select-search">
            <Search size={14} />
            <input
              className="input"
              autoFocus
              value={q}
              placeholder="Tapez pour filtrer…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
            />
            {loading ? <Loader2 size={14} className="spin" /> : null}
          </div>
          <ul className="search-select-list">
            {options.length === 0 && !loading ? (
              <li className="search-select-empty">{emptyLabel}</li>
            ) : null}
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={`search-select-option ${opt.value === value ? 'is-active' : ''}`}
                  onClick={() => pick(opt)}
                >
                  <span>
                    <strong>{opt.label}</strong>
                    {opt.meta ? <span className="muted">{opt.meta}</span> : null}
                  </span>
                  {opt.value === value ? <Check size={14} /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => undefined}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
        />
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';

type Mode = 'date' | 'datetime';

type Props = {
  value: string;
  onChange: (value: string) => void;
  mode?: Mode;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  min?: string;
  max?: string;
};

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseValue(value: string, mode: Mode) {
  if (!value) return null;
  if (mode === 'date') {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const [datePart, timePart = '00:00'] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

function toDateValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateTimeValue(d: Date) {
  return `${toDateValue(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplay(value: string, mode: Mode) {
  const d = parseValue(value, mode);
  if (!d) return '';
  if (mode === 'date') {
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return d.toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCells(month: Date) {
  const first = startOfMonth(month);
  // Monday-first: getDay() Sun=0 → shift
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function DatePicker({
  value,
  onChange,
  mode = 'date',
  label,
  placeholder,
  disabled,
  required,
  allowClear = true,
  min,
  max,
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseValue(value, mode);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? new Date());
  const [hour, setHour] = useState(selected?.getHours() ?? 9);
  const [minute, setMinute] = useState(selected?.getMinutes() ?? 0);

  const minDate = min ? parseValue(min, mode) : null;
  const maxDate = max ? parseValue(max, mode) : null;

  useEffect(() => {
    if (!open) return;
    setView(selected ?? new Date());
    if (selected) {
      setHour(selected.getHours());
      setMinute(selected.getMinutes());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function onDoc(e: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const cells = useMemo(() => buildCells(view), [view]);
  const monthLabel = view.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  function isDisabledDay(d: Date) {
    if (minDate) {
      const minDay = new Date(minDate);
      minDay.setHours(0, 0, 0, 0);
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      if (day < minDay) return true;
    }
    if (maxDate) {
      const maxDay = new Date(maxDate);
      maxDay.setHours(23, 59, 59, 999);
      if (d > maxDay) return true;
    }
    return false;
  }

  function commit(day: Date, h = hour, m = minute) {
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
    if (mode === 'date') {
      onChange(toDateValue(next));
      setOpen(false);
      return;
    }
    onChange(toDateTimeValue(next));
  }

  function pickDay(day: Date) {
    if (isDisabledDay(day)) return;
    commit(day, hour, minute);
  }

  function applyTime(nextHour: number, nextMinute: number) {
    setHour(nextHour);
    setMinute(nextMinute);
    const base = selected ?? view;
    commit(base, nextHour, nextMinute);
  }

  function goToday() {
    const now = new Date();
    setView(now);
    if (mode === 'datetime') {
      setHour(now.getHours());
      setMinute(Math.floor(now.getMinutes() / 5) * 5);
      commit(now, now.getHours(), Math.floor(now.getMinutes() / 5) * 5);
    } else {
      commit(now);
    }
  }

  const display = formatDisplay(value, mode);
  const ph =
    placeholder ??
    (mode === 'datetime' ? 'Choisir date et heure…' : 'Choisir une date…');

  return (
    <div className={`datepicker ${disabled ? 'is-disabled' : ''}`} ref={rootRef}>
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
        className="datepicker-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
      >
        <CalendarDays size={16} className="datepicker-icon" />
        <span className={display ? '' : 'muted'}>{display || ph}</span>
        <span className="datepicker-actions">
          {allowClear && value ? (
            <X
              size={14}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              aria-label="Effacer"
            />
          ) : null}
        </span>
      </button>

      {open ? (
        <div className="datepicker-panel" role="dialog" aria-label={label || 'Calendrier'}>
          <div className="datepicker-toolbar">
            <button
              type="button"
              className="datepicker-nav"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
              }
              aria-label="Mois précédent"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="datepicker-month">{monthLabel}</div>
            <button
              type="button"
              className="datepicker-nav"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
              }
              aria-label="Mois suivant"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="datepicker-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="datepicker-grid">
            {cells.map((day) => {
              const inMonth = day.getMonth() === view.getMonth();
              const isSelected = selected ? sameDay(day, selected) : false;
              const isToday = sameDay(day, new Date());
              const disabledDay = isDisabledDay(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabledDay}
                  className={[
                    'datepicker-day',
                    inMonth ? '' : 'is-muted',
                    isSelected ? 'is-selected' : '',
                    isToday ? 'is-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => pickDay(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {mode === 'datetime' ? (
            <div className="datepicker-time">
              <Clock3 size={14} />
              <select
                className="select datepicker-time-select"
                value={hour}
                onChange={(e) => applyTime(Number(e.target.value), minute)}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {pad(h)} h
                  </option>
                ))}
              </select>
              <select
                className="select datepicker-time-select"
                value={minute}
                onChange={(e) => applyTime(hour, Number(e.target.value))}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="datepicker-footer">
            <button type="button" className="btn btn-ghost" onClick={goToday}>
              Aujourd’hui
            </button>
            {mode === 'datetime' ? (
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                OK
              </button>
            ) : null}
          </div>
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

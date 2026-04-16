import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-copy">
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}

export type StatGridItem = {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  color?: string;
};

type StatGridProps = {
  cols?: 2 | 3 | 4;
  items: StatGridItem[];
};

export function StatGrid({ cols = 4, items }: StatGridProps) {
  return (
    <div className={`stat-grid-${cols}`}>
      {items.map((item, index) => (
        <div key={`${String(item.label)}-${index}`} className="stat-card section-card tx-stat-card">
          <div className="card-label">{item.label}</div>
          <div className="stat-value" style={{ color: item.color }}>
            {item.value}
          </div>
          {item.sub && <div className="stat-subvalue">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}

type TxTypePillsProps = {
  value: string;
  onChange: (value: string) => void;
};

const TX_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'transfer_in', label: 'Received' },
  { value: 'transfer_out', label: 'Sent' },
  { value: 'swap', label: 'Swaps' },
] as const;

export function TxTypePills({ value, onChange }: TxTypePillsProps) {
  return (
    <div className="tx-type-pills">
      {TX_TYPE_OPTIONS.map(option => (
        <button
          key={option.value}
          className={`tx-type-pill${value === option.value ? ' active' : ''}`}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type TxFilterConfig = {
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  label?: string;
};

type TxFiltersProps = {
  filters: TxFilterConfig[];
  children?: ReactNode;
};

export function TxFilters({ filters, children }: TxFiltersProps) {
  return (
    <div className="tx-filter-row">
      {filters.map((filter, index) => (
        <select
          key={`${filter.label ?? 'filter'}-${index}`}
          aria-label={filter.label}
          value={filter.value}
          onChange={event => filter.onChange(event.target.value)}
          className="history-filter-select"
        >
          {filter.options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
      ))}
      {children}
    </div>
  );
}

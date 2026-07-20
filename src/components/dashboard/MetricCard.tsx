'use client';

import type { IconType } from 'react-icons';

interface MetricCardProps {
  label: string;
  value: string;
  note?: string;
  href?: string;
  icon?: IconType;
  trend?: { direction: 'up' | 'down'; percent: number };
}

export default function MetricCard({ label, value, note, href, icon: Icon, trend }: MetricCardProps) {
  const content = (
    <div className={`adeera-card group flex h-full flex-col gap-2 p-4 ${href ? 'adeera-card-interactive' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="adeera-label">{label}</p>
        {Icon && (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--adeera-surface-muted) text-(--adeera-text-muted) transition-colors duration-150 group-hover:bg-(--adeera-accent-soft) group-hover:text-(--adeera-accent)">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-xl font-semibold tracking-tight text-(--adeera-text)">{value}</p>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
              trend.direction === 'up' ? 'text-(--adeera-success)' : 'text-(--adeera-danger)'
            }`}
          >
            {trend.direction === 'up' ? '▲' : '▼'}
            {Math.abs(trend.percent).toFixed(1)}%
          </span>
        )}
      </div>
      {note && <p className="text-xs text-(--adeera-text-muted)">{note}</p>}
    </div>
  );

  if (!href) return content;

  return (
    <a href={href} className="block h-full">
      {content}
    </a>
  );
}

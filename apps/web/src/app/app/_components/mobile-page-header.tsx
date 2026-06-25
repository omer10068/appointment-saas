'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

export interface MobilePageHeaderProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  subtitle?: string;
  meta?: ReactNode;
  backHref?: string;
  className?: string;
  children?: ReactNode;
}

const DEFAULT_CLASS = 'flex-none bg-background px-5 pt-9 pb-4';

export function MobilePageHeader({
  title,
  icon: Icon,
  subtitle,
  meta,
  backHref,
  className,
  children,
}: MobilePageHeaderProps) {
  const router = useRouter();

  return (
    <header className={className ?? DEFAULT_CLASS}>
      {backHref && (
        <button
          onClick={() => router.push(backHref)}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-opacity active:opacity-60"
          aria-label="חזרה"
        >
          <ChevronRight className="size-4" />
          <span>חזרה</span>
        </button>
      )}
      <div className={`flex items-start justify-between${backHref ? ' mt-2' : ''}`}>
        <div>
          {subtitle && (
            <p className="text-sm font-semibold text-primary">{subtitle}</p>
          )}
          <h1
            className={`text-xl font-bold tracking-tight text-foreground${subtitle ? ' mt-1' : ''}`}
          >
            {title}
          </h1>
          {meta != null && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">{meta}</p>
          )}
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
          <Icon className="size-5" />
        </div>
      </div>
      {children}
    </header>
  );
}

import { Building2 } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  return (
    <header className="flex-none bg-background px-5 pt-9 pb-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            ניהול פנימי
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
          <Building2 className="size-5" />
        </div>
      </div>
    </header>
  );
}

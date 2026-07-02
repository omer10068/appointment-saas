import type { ComponentType } from 'react';

interface Props {
  icon: ComponentType<{ className?: string }>;
  heading: string;
  subtext: string;
}

export function AppAccessStateCard({ icon: Icon, heading, subtext }: Props) {
  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-8 text-center shadow-sm shadow-foreground/5">
      <Icon className="mx-auto mb-3 size-8 text-muted-foreground/30" aria-hidden="true" />
      <p className="text-base font-semibold text-foreground">{heading}</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtext}</p>
    </div>
  );
}

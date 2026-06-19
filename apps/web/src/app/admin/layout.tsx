import { QueryProvider } from '@/app/_providers/query-provider';
import { AdminAccessGate } from './_components/admin-access-gate';

export const dynamic = 'force-dynamic';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="md:min-h-dvh md:overflow-y-auto md:flex md:items-center md:justify-center md:py-8 md:bg-muted">
        <AdminAccessGate>{children}</AdminAccessGate>
      </div>
    </QueryProvider>
  );
}

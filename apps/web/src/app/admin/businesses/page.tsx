import { auth } from '@clerk/nextjs/server';
import type { BusinessDto } from '@appointment/contracts';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { BusinessesTable } from '../_components/BusinessesTable';
import { CreateBusinessForm } from '../_components/CreateBusinessForm';
import { AssignOwnerForm } from '../_components/AssignOwnerForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type FetchResult =
  | { kind: 'ok'; businesses: BusinessDto[] }
  | { kind: 'denied' }
  | { kind: 'error'; message: string };

async function fetchBusinesses(token: string): Promise<FetchResult> {
  const res = await fetch(`${API_URL}/admin/businesses`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (res.status === 403) return { kind: 'denied' };

  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const json = JSON.parse(text) as { message?: string };
      message = json.message ?? text;
    } catch {
      message = text;
    }
    return { kind: 'error', message };
  }

  const businesses = (await res.json()) as BusinessDto[];
  return { kind: 'ok', businesses };
}

export default async function AdminBusinessesPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const result = await fetchBusinesses(token ?? '');

  if (result.kind === 'denied') {
    return (
      <>
        <AdminPageHeader title="Businesses" />
        <p className="text-sm font-semibold text-red-600">
          Access denied. You must be an admin to view this page.
        </p>
      </>
    );
  }

  if (result.kind === 'error') {
    return (
      <>
        <AdminPageHeader title="Businesses" />
        <p className="text-sm text-red-600">
          Error loading businesses: {result.message}
        </p>
      </>
    );
  }

  const { businesses } = result;

  return (
    <>
      <AdminPageHeader
        title="Businesses"
        description="Manage all registered businesses on the platform."
      />

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            All Businesses
          </h2>
          <BusinessesTable businesses={businesses} />
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Create Business
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <CreateBusinessForm />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Assign Owner
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <AssignOwnerForm businesses={businesses} />
          </div>
        </section>
      </div>
    </>
  );
}

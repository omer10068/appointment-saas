import { auth } from '@clerk/nextjs/server';
import type { BusinessDto } from '@appointment/contracts';
import { BusinessesTable } from './_components/BusinessesTable';
import { CreateBusinessForm } from './_components/CreateBusinessForm';
import { AssignOwnerForm } from './_components/AssignOwnerForm';

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

const hr: React.CSSProperties = { margin: '1.5rem 0', border: 'none', borderTop: '1px solid #ddd' };

export default async function AdminPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const result = await fetchBusinesses(token ?? '');

  if (result.kind === 'denied') {
    return (
      <p style={{ color: 'crimson', fontWeight: 'bold' }}>
        Access denied. You must be an admin to use this page.
      </p>
    );
  }

  if (result.kind === 'error') {
    return (
      <p style={{ color: 'crimson' }}>
        Error loading businesses: {result.message}
      </p>
    );
  }

  const { businesses } = result;

  return (
    <>
      <section>
        <h2>Businesses</h2>
        <BusinessesTable businesses={businesses} />
      </section>

      <hr style={hr} />

      <section>
        <h2>Create Business</h2>
        <CreateBusinessForm />
      </section>

      <hr style={hr} />

      <section>
        <h2>Assign Owner</h2>
        <AssignOwnerForm businesses={businesses} />
      </section>
    </>
  );
}

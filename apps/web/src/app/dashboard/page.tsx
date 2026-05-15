'use client';

import { useAuth, useUser, SignOutButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import type { BusinessUserWithBusinessDto } from '@appointment/contracts';

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [businesses, setBusinesses] = useState<BusinessUserWithBusinessDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    fetchWithAuth<BusinessUserWithBusinessDto[]>('/businesses/me', getToken)
      .then(setBusinesses)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Unknown error'),
      )
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, getToken]);

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <SignOutButton>
          <button>Sign out</button>
        </SignOutButton>
      </div>

      {user && (
        <p style={{ color: '#555' }}>
          Signed in as <strong>{user.primaryEmailAddress?.emailAddress}</strong>
        </p>
      )}

      <hr style={{ margin: '1.5rem 0' }} />

      <h2>Your businesses</h2>

      {loading && <p>Loading...</p>}

      {error && (
        <p style={{ color: 'red' }}>
          Error: {error}
        </p>
      )}

      {!loading && !error && businesses !== null && (
        businesses.length === 0 ? (
          <p style={{ color: '#888' }}>
            No businesses assigned. Ask a platform admin to add you as an owner.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {businesses.map((bu) => (
              <li
                key={bu.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                }}
              >
                <strong>{bu.business.name}</strong>{' '}
                <span style={{ color: '#888' }}>({bu.business.slug})</span>
                <br />
                <small>
                  Role: {bu.role} &nbsp;|&nbsp; Status: {bu.status} &nbsp;|&nbsp;
                  Business status: {bu.business.status}
                </small>
              </li>
            ))}
          </ul>
        )
      )}
    </main>
  );
}

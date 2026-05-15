'use client';

import { useAuth, useUser, SignOutButton } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth, ApiError } from '@/lib/api';
import type { BusinessDto, BusinessUserDto } from '@appointment/contracts';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function AdminPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [businesses, setBusinesses] = useState<BusinessDto[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [ownerBusinessId, setOwnerBusinessId] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerSuccess, setOwnerSuccess] = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setAccessDenied(false);
    try {
      const data = await fetchWithAuth<BusinessDto[]>('/admin/businesses', getToken);
      setBusinesses(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setAccessDenied(true);
      } else {
        setListError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setListLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void loadBusinesses();
  }, [isLoaded, isSignedIn, loadBusinesses]);

  function handleNameChange(value: string) {
    setCreateName(value);
    if (!slugManual) {
      setCreateSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setCreateSlug(value);
  }

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!SLUG_RE.test(createSlug)) {
      setCreateError('Slug must be lowercase letters, numbers, and hyphens only (e.g. my-business).');
      return;
    }

    setCreateLoading(true);
    try {
      const business = await fetchWithAuth<BusinessDto>('/admin/businesses', getToken, {
        method: 'POST',
        body: { name: createName, slug: createSlug },
      });
      setCreateSuccess(`Business "${business.name}" created successfully.`);
      setCreateName('');
      setCreateSlug('');
      setSlugManual(false);
      await loadBusinesses();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setAccessDenied(true);
      } else {
        setCreateError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleAssignOwner(e: React.FormEvent) {
    e.preventDefault();
    setOwnerError(null);
    setOwnerSuccess(null);

    if (!ownerBusinessId) {
      setOwnerError('Please select a business.');
      return;
    }

    setOwnerLoading(true);
    try {
      await fetchWithAuth<BusinessUserDto>(`/admin/businesses/${ownerBusinessId}/owner`, getToken, {
        method: 'POST',
        body: { email: ownerEmail },
      });
      const biz = businesses.find((b) => b.id === ownerBusinessId);
      setOwnerSuccess(`Owner assigned to "${biz?.name ?? ownerBusinessId}" successfully.`);
      setOwnerEmail('');
      setOwnerBusinessId('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setAccessDenied(true);
      } else {
        setOwnerError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setOwnerLoading(false);
    }
  }

  if (!isLoaded) return <main style={styles.main}><p>Loading...</p></main>;

  if (accessDenied) {
    return (
      <main style={styles.main}>
        <p style={{ color: 'crimson', fontWeight: 'bold' }}>
          Access denied. You must be an admin to use this page.
        </p>
      </main>
    );
  }

  const slugInvalid = createSlug.length > 0 && !SLUG_RE.test(createSlug);

  return (
    <main style={styles.main}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Panel</h1>
          {user && (
            <p style={{ margin: '0.25rem 0 0', color: '#555', fontSize: '0.9rem' }}>
              {user.primaryEmailAddress?.emailAddress}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/dashboard" style={styles.link}>Dashboard</a>
          <SignOutButton>
            <button style={styles.btn}>Sign out</button>
          </SignOutButton>
        </div>
      </div>

      <hr style={styles.hr} />

      {/* Business List */}
      <section>
        <h2>Businesses</h2>
        {listLoading && <p>Loading businesses...</p>}
        {listError && <p style={styles.error}>Error: {listError}</p>}
        {!listLoading && !listError && (
          businesses.length === 0 ? (
            <p style={{ color: '#888' }}>No businesses yet.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Slug</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id}>
                    <td style={styles.td}>{b.name}</td>
                    <td style={styles.td}>{b.slug}</td>
                    <td style={styles.td}>{b.status}</td>
                    <td style={styles.td}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>

      <hr style={styles.hr} />

      {/* Create Business */}
      <section>
        <h2>Create Business</h2>
        <form onSubmit={(e) => { void handleCreateBusiness(e); }} style={styles.form}>
          <label style={styles.label}>
            Name
            <input
              style={styles.input}
              type="text"
              value={createName}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={100}
              placeholder="Acme Corp"
              disabled={createLoading}
            />
          </label>
          <label style={styles.label}>
            Slug
            <input
              style={{ ...styles.input, borderColor: slugInvalid ? 'crimson' : undefined }}
              type="text"
              value={createSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              maxLength={100}
              placeholder="acme-corp"
              disabled={createLoading}
            />
            {slugInvalid && (
              <span style={styles.fieldError}>
                Lowercase letters, numbers, and hyphens only.
              </span>
            )}
          </label>
          <button type="submit" style={styles.btn} disabled={createLoading || slugInvalid}>
            {createLoading ? 'Creating...' : 'Create Business'}
          </button>
          {createError && <p style={styles.error}>{createError}</p>}
          {createSuccess && <p style={styles.success}>{createSuccess}</p>}
        </form>
      </section>

      <hr style={styles.hr} />

      {/* Assign Owner */}
      <section>
        <h2>Assign Owner</h2>
        <form onSubmit={(e) => { void handleAssignOwner(e); }} style={styles.form}>
          <label style={styles.label}>
            Business
            <select
              style={styles.input}
              value={ownerBusinessId}
              onChange={(e) => setOwnerBusinessId(e.target.value)}
              required
              disabled={ownerLoading || businesses.length === 0}
            >
              <option value="">Select a business...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.slug})</option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Owner Email
            <input
              style={styles.input}
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
              placeholder="owner@example.com"
              disabled={ownerLoading}
            />
          </label>
          <button
            type="submit"
            style={styles.btn}
            disabled={ownerLoading || businesses.length === 0}
          >
            {ownerLoading ? 'Assigning...' : 'Assign Owner'}
          </button>
          {ownerError && <p style={styles.error}>{ownerError}</p>}
          {ownerSuccess && <p style={styles.success}>{ownerSuccess}</p>}
        </form>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  hr: { margin: '1.5rem 0', border: 'none', borderTop: '1px solid #ddd' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 600 },
  input: { padding: '0.4rem 0.6rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' },
  btn: { padding: '0.45rem 1rem', fontSize: '0.95rem', cursor: 'pointer' },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #ddd', fontSize: '0.85rem', color: '#555' },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' },
  error: { color: 'crimson', margin: '0.25rem 0' },
  success: { color: 'green', margin: '0.25rem 0' },
  fieldError: { color: 'crimson', fontSize: '0.8rem', fontWeight: 400 },
  link: { fontSize: '0.9rem', alignSelf: 'center' },
};

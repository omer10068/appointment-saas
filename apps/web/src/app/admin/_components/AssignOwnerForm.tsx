'use client';

import { useActionState, useState, useEffect } from 'react';
import type { BusinessDto } from '@appointment/contracts';
import { assignOwnerAction } from '../actions';

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 600 },
  input: { padding: '0.4rem 0.6rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' },
  btn: { padding: '0.45rem 1rem', fontSize: '0.95rem', cursor: 'pointer' },
  error: { color: 'crimson', margin: '0.25rem 0' },
  success: { color: 'green', margin: '0.25rem 0' },
};

export function AssignOwnerForm({ businesses }: { businesses: BusinessDto[] }) {
  const [state, formAction, isPending] = useActionState(assignOwnerAction, {});
  const [businessId, setBusinessId] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (state.success) {
      setBusinessId('');
      setEmail('');
    }
  }, [state.success]);

  return (
    <form action={formAction} style={styles.form} autoComplete="off">
      <label style={styles.label}>
        Business
        <select
          style={styles.input}
          name="businessId"
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          required
          disabled={isPending || businesses.length === 0}
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
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="owner@example.com"
          disabled={isPending}
        />
      </label>
      <button
        type="submit"
        style={styles.btn}
        disabled={isPending || businesses.length === 0}
      >
        {isPending ? 'Assigning...' : 'Assign Owner'}
      </button>
      {state.error && <p style={styles.error}>{state.error}</p>}
      {state.success && <p style={styles.success}>{state.success}</p>}
    </form>
  );
}

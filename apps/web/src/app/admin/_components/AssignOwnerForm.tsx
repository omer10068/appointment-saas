'use client';

import { useActionState, useState, useEffect } from 'react';
import type { BusinessDto } from '@appointment/contracts';
import { assignOwnerAction } from '../actions';

const inputBase =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50';

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
    <form action={formAction} className="flex flex-col gap-4 max-w-sm" autoComplete="off">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Business</span>
        <select
          className={inputBase}
          name="businessId"
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          required
          disabled={isPending || businesses.length === 0}
        >
          <option value="">Select a business…</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.slug})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Owner Email</span>
        <input
          className={inputBase}
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
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start"
        disabled={isPending || businesses.length === 0}
      >
        {isPending ? 'Assigning…' : 'Assign Owner'}
      </button>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600">{state.success}</p>
      )}
    </form>
  );
}

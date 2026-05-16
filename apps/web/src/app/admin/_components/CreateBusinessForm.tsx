'use client';

import { useActionState, useState, useEffect } from 'react';
import { createBusinessAction } from '../actions';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const inputBase =
  'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50';

export function CreateBusinessForm() {
  const [state, formAction, isPending] = useActionState(createBusinessAction, {});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);

  useEffect(() => {
    if (state.success) {
      setName('');
      setSlug('');
      setSlugManual(false);
    }
  }, [state.success]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setSlug(value);
  }

  const slugInvalid = slug.length > 0 && !SLUG_RE.test(slug);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm" autoComplete="off">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Name</span>
        <input
          className={`${inputBase} border-gray-300`}
          name="name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          maxLength={100}
          placeholder="Acme Corp"
          disabled={isPending}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Slug</span>
        <input
          className={`${inputBase} ${slugInvalid ? 'border-red-400' : 'border-gray-300'}`}
          name="slug"
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          required
          maxLength={100}
          placeholder="acme-corp"
          disabled={isPending}
        />
        {slugInvalid && (
          <span className="text-xs text-red-600">
            Lowercase letters, numbers, and hyphens only.
          </span>
        )}
      </label>

      <button
        type="submit"
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start"
        disabled={isPending || slugInvalid}
      >
        {isPending ? 'Creating…' : 'Create Business'}
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

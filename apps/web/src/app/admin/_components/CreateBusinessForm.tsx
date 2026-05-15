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

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 600 },
  input: { padding: '0.4rem 0.6rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' },
  btn: { padding: '0.45rem 1rem', fontSize: '0.95rem', cursor: 'pointer' },
  error: { color: 'crimson', margin: '0.25rem 0' },
  success: { color: 'green', margin: '0.25rem 0' },
  fieldError: { color: 'crimson', fontSize: '0.8rem', fontWeight: 400 },
};

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
    <form action={formAction} style={styles.form} autoComplete="off">
      <label style={styles.label}>
        Name
        <input
          style={styles.input}
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
      <label style={styles.label}>
        Slug
        <input
          style={{ ...styles.input, borderColor: slugInvalid ? 'crimson' : undefined }}
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
          <span style={styles.fieldError}>
            Lowercase letters, numbers, and hyphens only.
          </span>
        )}
      </label>
      <button type="submit" style={styles.btn} disabled={isPending || slugInvalid}>
        {isPending ? 'Creating...' : 'Create Business'}
      </button>
      {state.error && <p style={styles.error}>{state.error}</p>}
      {state.success && <p style={styles.success}>{state.success}</p>}
    </form>
  );
}

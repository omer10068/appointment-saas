'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import type { BusinessDto } from '@appointment/contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function parseNestError(text: string): string {
  try {
    const json = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(json.message)) return json.message.join(', ');
    return json.message ?? text;
  } catch {
    return text;
  }
}

export async function createBusinessAction(
  _prev: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const name = (formData.get('name') as string | null) ?? '';
  const slug = (formData.get('slug') as string | null) ?? '';

  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${API_URL}/admin/businesses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, slug }),
  });

  if (!res.ok) {
    return { error: parseNestError(await res.text()) };
  }

  const business = (await res.json()) as BusinessDto;
  revalidatePath('/admin');
  return { success: `Business "${business.name}" created successfully.` };
}

export async function assignOwnerAction(
  _prev: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const businessId = (formData.get('businessId') as string | null) ?? '';
  const email = (formData.get('email') as string | null) ?? '';

  if (!businessId) return { error: 'Please select a business.' };

  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${API_URL}/admin/businesses/${businessId}/owner`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    return { error: parseNestError(await res.text()) };
  }

  revalidatePath('/admin');
  return { success: 'Owner assigned successfully.' };
}

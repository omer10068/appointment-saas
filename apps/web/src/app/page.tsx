import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Appointment SaaS</h1>
      <p>Please sign in to continue.</p>
      <SignedOut>
        <SignInButton mode="modal">
          <button>Sign in</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <p>Redirecting...</p>
      </SignedIn>
    </main>
  );
}

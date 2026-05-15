import { currentUser } from '@clerk/nextjs/server';
import { AdminHeader } from './_components/AdminHeader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <AdminHeader email={email} />
      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}

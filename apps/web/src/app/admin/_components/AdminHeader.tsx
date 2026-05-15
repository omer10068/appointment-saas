import { SignOutButton } from '@clerk/nextjs';

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.9rem 2rem',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#fafafa',
  },
  brand: { margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em', color: '#111' },
  meta: { margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#888' },
  nav: { display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.9rem' },
  link: { color: '#0070f3', textDecoration: 'none' },
  btn: { padding: '0.4rem 0.9rem', fontSize: '0.9rem', cursor: 'pointer' },
};

export function AdminHeader({ email }: { email?: string }) {
  return (
    <header style={styles.header}>
      <div>
        <p style={styles.brand}>Platform Admin</p>
        {email && <p style={styles.meta}>{email}</p>}
      </div>
      <nav style={styles.nav}>
        <a href="/dashboard" style={styles.link}>Dashboard</a>
        <SignOutButton>
          <button style={styles.btn}>Sign out</button>
        </SignOutButton>
      </nav>
    </header>
  );
}

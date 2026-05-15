import type { BusinessDto } from '@appointment/contracts';

const styles: Record<string, React.CSSProperties> = {
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #ddd', fontSize: '0.85rem', color: '#555' },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' },
};

export function BusinessesTable({ businesses }: { businesses: BusinessDto[] }) {
  if (businesses.length === 0) {
    return <p style={{ color: '#888' }}>No businesses yet.</p>;
  }

  return (
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
  );
}

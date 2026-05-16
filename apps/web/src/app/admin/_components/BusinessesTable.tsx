import type { BusinessDto } from '@appointment/contracts';
import { StatusBadge } from './StatusBadge';

export function BusinessesTable({ businesses }: { businesses: BusinessDto[] }) {
  if (businesses.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">No businesses yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Name', 'Slug', 'Status', 'Created'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {businesses.map((b) => (
            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.slug}</td>
              <td className="px-4 py-3">
                <StatusBadge status={b.status} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

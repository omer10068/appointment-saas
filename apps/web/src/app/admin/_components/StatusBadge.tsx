const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  TRIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  INVITED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  BLOCKED: 'bg-red-50 text-red-700 border-red-200',
  DISABLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function StatusBadge({ status }: { status: string }) {
  const cls =
    statusStyles[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}
    >
      {status}
    </span>
  );
}

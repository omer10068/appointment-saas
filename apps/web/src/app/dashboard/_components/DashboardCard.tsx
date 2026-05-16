export function DashboardCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-300 dark:text-gray-600">—</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>
      )}
    </div>
  );
}

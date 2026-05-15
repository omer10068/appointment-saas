export function DashboardCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-300">—</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}

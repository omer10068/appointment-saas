export function AdminCard({
  title,
  value,
  description,
}: {
  title: string;
  value?: string | number;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value !== undefined ? value : (
          <span className="text-gray-300">—</span>
        )}
      </p>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}

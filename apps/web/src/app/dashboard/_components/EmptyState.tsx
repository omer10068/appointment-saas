export function EmptyState({
  title,
  description,
  comingSoon = 'Coming soon',
}: {
  title: string;
  description?: string;
  comingSoon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4 dark:bg-gray-700">
        <svg
          className="w-5 h-5 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 max-w-xs dark:text-gray-400">{description}</p>
      )}
      <span className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
        {comingSoon}
      </span>
    </div>
  );
}

import { SignOutButton } from '@clerk/nextjs';

export function DashboardHeader({ email }: { email?: string }) {
  return (
    <header className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {email ? (
        <span className="text-sm text-gray-500">{email}</span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-4">
        <SignOutButton>
          <button className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </header>
  );
}

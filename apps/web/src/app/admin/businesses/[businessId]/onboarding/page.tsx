import { AdminOnboardingShell } from '@/app/admin/_components/admin-onboarding-shell';

export default async function AdminOnboardingPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  return <AdminOnboardingShell businessId={businessId} />;
}

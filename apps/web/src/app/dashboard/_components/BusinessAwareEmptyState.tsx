'use client';

import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { EmptyState } from './EmptyState';

export function BusinessAwareEmptyState({
  title,
  emptyDescription,
  managesFor,
  comingSoon,
}: {
  title: string;
  emptyDescription: string;
  managesFor: string;
  comingSoon: string;
}) {
  const { currentBusiness } = useDashboardBusiness();

  const description = currentBusiness
    ? `${managesFor} ${currentBusiness.business.name}.`
    : emptyDescription;

  return (
    <EmptyState title={title} description={description} comingSoon={comingSoon} />
  );
}

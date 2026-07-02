import type { BusinessUserWithBusinessDto } from '@appointment/contracts';

export type AppAccessState =
  | 'no-access'
  | 'invited'
  | 'inactive'
  | 'draft'
  | 'suspended'
  | 'cancelled'
  | 'active';

/**
 * Pure decision function for the shared /app access gate. Kept separate from
 * the rendering component so it's testable without a component-rendering
 * framework (none is installed in this project — see AppAccessGate).
 *
 * Backend guards (assertAccess / assertOwnerAccess / assertMutationAccess)
 * remain the authoritative enforcement; this only decides what the frontend
 * shell shows before any data hooks would otherwise mount and start firing
 * requests that are guaranteed to 403.
 */
export function resolveAppAccessState(
  currentBusiness: BusinessUserWithBusinessDto | null,
): AppAccessState {
  if (!currentBusiness) {
    return 'no-access';
  }
  if (currentBusiness.status === 'INVITED') {
    return 'invited';
  }
  if (currentBusiness.status !== 'ACTIVE') {
    // BLOCKED, or any future BusinessUserStatus value not explicitly handled.
    return 'inactive';
  }

  const businessStatus = currentBusiness.business.status;
  if (businessStatus === 'DRAFT') {
    return 'draft';
  }
  if (businessStatus === 'SUSPENDED') {
    return 'suspended';
  }
  if (businessStatus === 'CANCELLED') {
    return 'cancelled';
  }

  // TRIAL or ACTIVE business + ACTIVE membership.
  return 'active';
}

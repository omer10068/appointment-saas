import type { BusinessUserWithBusinessDto } from '@appointment/contracts';
import { resolveAppAccessState } from '../app-access-gate.logic';

function makeMembership(
  overrides: Partial<BusinessUserWithBusinessDto> = {},
): BusinessUserWithBusinessDto {
  return {
    id: 'bu-1',
    role: 'MEMBER',
    status: 'ACTIVE',
    business: {
      id: 'biz-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      status: 'ACTIVE',
    },
    ...overrides,
  };
}

describe('resolveAppAccessState', () => {
  it('returns no-access when there is no membership at all', () => {
    expect(resolveAppAccessState(null)).toBe('no-access');
  });

  it('returns invited when the BusinessUser is INVITED, regardless of business status', () => {
    const membership = makeMembership({ status: 'INVITED' });
    expect(resolveAppAccessState(membership)).toBe('invited');
  });

  it('returns inactive when the BusinessUser is BLOCKED', () => {
    const membership = makeMembership({ status: 'BLOCKED' });
    expect(resolveAppAccessState(membership)).toBe('inactive');
  });

  it('returns draft when the business is DRAFT and membership is ACTIVE', () => {
    const membership = makeMembership({
      status: 'ACTIVE',
      business: { ...makeMembership().business, status: 'DRAFT' },
    });
    expect(resolveAppAccessState(membership)).toBe('draft');
  });

  it('returns suspended when the business is SUSPENDED and membership is ACTIVE', () => {
    const membership = makeMembership({
      status: 'ACTIVE',
      business: { ...makeMembership().business, status: 'SUSPENDED' },
    });
    expect(resolveAppAccessState(membership)).toBe('suspended');
  });

  it('returns cancelled when the business is CANCELLED and membership is ACTIVE', () => {
    const membership = makeMembership({
      status: 'ACTIVE',
      business: { ...makeMembership().business, status: 'CANCELLED' },
    });
    expect(resolveAppAccessState(membership)).toBe('cancelled');
  });

  it('returns active when the business is TRIAL and membership is ACTIVE', () => {
    const membership = makeMembership({
      status: 'ACTIVE',
      business: { ...makeMembership().business, status: 'TRIAL' },
    });
    expect(resolveAppAccessState(membership)).toBe('active');
  });

  it('returns active when the business is ACTIVE and membership is ACTIVE', () => {
    const membership = makeMembership({
      status: 'ACTIVE',
      business: { ...makeMembership().business, status: 'ACTIVE' },
    });
    expect(resolveAppAccessState(membership)).toBe('active');
  });

  it('prioritizes membership status over business status (INVITED wins over an ACTIVE business)', () => {
    const membership = makeMembership({
      status: 'INVITED',
      business: { ...makeMembership().business, status: 'ACTIVE' },
    });
    expect(resolveAppAccessState(membership)).toBe('invited');
  });

  it('prioritizes membership status over business status (BLOCKED wins over an ACTIVE business)', () => {
    const membership = makeMembership({
      status: 'BLOCKED',
      business: { ...makeMembership().business, status: 'ACTIVE' },
    });
    expect(resolveAppAccessState(membership)).toBe('inactive');
  });
});

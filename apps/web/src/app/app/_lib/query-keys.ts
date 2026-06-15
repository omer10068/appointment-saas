/**
 * Centralized TanStack Query key factory for the Business App.
 *
 * All hooks that participate in the shared query cache must derive their keys
 * from these factories so invalidation logic in mutation callbacks can reference
 * keys without string literals scattered across files.
 *
 * Naming convention:
 *   - Leaf functions return the full key for a specific query.
 *   - `weekAppointmentsAll` returns a prefix key (no weekStartISO) suitable for
 *     `queryClient.invalidateQueries` to invalidate all cached weeks at once.
 */
export const appKeys = {
  services: (businessId: string) =>
    ['app', 'services', businessId] as const,

  serviceProviders: (businessId: string) =>
    ['app', 'serviceProviders', businessId] as const,

  customers: (businessId: string) =>
    ['app', 'customers', businessId] as const,

  businessUsers: (businessId: string) =>
    ['app', 'businessUsers', businessId] as const,

  exceptions: (businessId: string) =>
    ['app', 'exceptions', businessId] as const,

  todayAppointments: (businessId: string) =>
    ['app', 'appointments', 'today', businessId] as const,

  weekAppointments: (businessId: string, weekStartISO: string) =>
    ['app', 'appointments', 'week', businessId, weekStartISO] as const,

  /** Prefix key — no weekStartISO. Used with invalidateQueries to cover all cached weeks. */
  weekAppointmentsAll: (businessId: string) =>
    ['app', 'appointments', 'week', businessId] as const,
};

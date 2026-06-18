# Role and Permission Model

## Two Separate Concepts

### 1. BusinessUser

A user who has Business App access to a business. Controlled by `BusinessUser.role`.

### 2. ServiceProvider

A bookable entity that appears in the calendar and can receive appointments. A `ServiceProvider` is linked to a `BusinessUser` but is a separate concept — a `BusinessUser` with `MEMBER` role may or may not have a corresponding `ServiceProvider` profile.

These are not the same thing. `BusinessUser.role` controls Business App permissions. `ServiceProvider` controls booking/calendar assignment.

---

## BusinessUser Roles

### OWNER

Full control over the business.

**Can:**

- Manage business settings
- Manage services
- Manage customers
- Manage appointments
- Edit/manage existing service providers (update display name, services, active status)
- Manage working hours
- Manage availability exceptions
- Invite/remove MANAGER users
- Invite/remove MEMBER users
- Change user roles
- Access business app
- Future: billing/subscription/ownership operations

### MANAGER

Operational manager.

**Can:**

- Manage services
- Manage customers
- Manage appointments
- Edit/manage existing service providers (update display name, services, active status)
- Manage working hours
- Manage availability exceptions
- Access business app

**Cannot:**

- Create new service providers (admin/ops only — see note below)
- Invite/remove users
- Change user roles
- Transfer ownership
- Manage billing/subscription
- Delete/suspend business

### MEMBER

Basic operational user with read access.

**Can:**

- View business app data
- View services
- View customers
- View service providers
- View appointments

**Cannot:**

- Manage users
- Change roles
- Create/edit/delete services
- Create/edit/delete service providers
- Create/update customers
- Block/archive customers
- Create appointments
- Update appointment details
- Change appointment status
- Manage working hours
- Manage availability exceptions
- Manage business settings
- Manage billing/subscription
- Delete/suspend business

**Possible future scope (not decided, not implemented):**

- Scoped appointment creation (e.g. only for their own service-provider calendar)
- Scoped appointment status change (e.g. only mark their own appointments complete)

---

## Permission Matrix

| Capability                             | OWNER | MANAGER | MEMBER |
|----------------------------------------|:-----:|:-------:|:------:|
| View business app                      | yes   | yes     | yes    |
| View services                          | yes   | yes     | yes    |
| Create/update/delete services          | yes   | yes     | no     |
| View customers                         | yes   | yes     | yes    |
| Create/update customers                | yes   | yes     | no     |
| Block/archive customers                | yes   | yes     | no     |
| View appointments                      | yes   | yes     | yes    |
| Create appointments                    | yes   | yes     | no     |
| Update appointment details             | yes   | yes     | no     |
| Change appointment status              | yes   | yes     | no     |
| View service providers                 | yes   | yes     | yes    |
| Create service providers               | no    | no      | no     |
| Update/edit existing service providers | yes   | yes     | no     |
| View working hours                     | yes   | yes     | yes    |
| Update working hours                   | yes   | yes     | no     |
| Manage availability exceptions         | yes   | yes     | no     |
| View business users                    | yes   | no      | no     |
| Invite MEMBER                          | yes   | no      | no     |
| Invite MANAGER                         | yes   | no      | no     |
| Remove business users                  | yes   | no      | no     |
| Change business user roles             | yes   | no      | no     |
| Business settings                      | yes   | no      | no     |
| Billing/subscription                   | yes   | no      | no     |

---

## Permission Gaps / Follow-up Tasks

The following items require an explicit decision before being tested, changed, or documented as final.

1. **MEMBER — appointment mutations**: Decided. MEMBER cannot create appointments, update appointment details, or change appointment status. All three appointment mutation endpoints use `assertMutationAccess` (OWNER/MANAGER only). Scoped MEMBER appointment actions may be revisited in a later phase (see MEMBER "Possible future scope" section above).

2. **View business users — verified behavior**: `GET /dashboard/businesses/:businessId/users` is OWNER-only (`assertOwnerAccess`). MANAGER, MEMBER, and outsiders receive 403. Missing auth receives 401. This matches the permission matrix.

3. **Invite/create users**: Only OWNER can call the business user invite/create endpoint (`POST .../users`). MANAGER is blocked. This aligns with the table above.

4. **Role and status management — implemented**: `PATCH .../users/:businessUserId/role` and `PATCH .../users/:businessUserId/status` are implemented, guarded by `assertOwnerAccess` (OWNER only).

   Role endpoint (`PATCH .../role`):
   - Accepts `role: MEMBER | MANAGER` only. OWNER cannot be assigned; ownership transfer is not supported.
   - Cannot change the role of a target whose current role is OWNER.
   - Caller cannot change their own role.

   Status endpoint (`PATCH .../status`):
   - Accepts `status: ACTIVE | BLOCKED` only. `INVITED` is not settable from the app.
   - Caller cannot change their own status.
   - Cannot block the last active OWNER of the business.

   Both endpoints scope the target lookup by both `businessUserId` and `businessId` — a foreign `businessUserId` from another business returns 404.

5. **Remove business users — not yet implemented**: Hard delete and soft-removal via a dedicated endpoint are deferred. Until a DELETE endpoint is added, blocking a user (`status = BLOCKED`) is the mechanism to revoke app access. MANAGER cannot remove users; this restriction is permanent per the permission matrix above.

6. **ServiceProvider creation — admin/ops only (locked):** `ServiceProvider` represents a bookable calendar/resource. Creating new ServiceProviders is restricted to platform admins via `POST /admin/businesses/:businessId/service-providers`. The dashboard endpoint (`POST /dashboard/businesses/:businessId/service-providers`) throws `ForbiddenException` for all callers. OWNER and MANAGER can update/edit existing providers via the dashboard but cannot create new ones. This decision is locked — do not open dashboard SP creation without an explicit product decision.

7. **Service creation — admin/ops during DRAFT phase:** Platform admins can create services for any business regardless of status via `POST /admin/businesses/:businessId/services`. This is an onboarding convenience endpoint — it exists because dashboard service creation (`POST /dashboard/businesses/:businessId/services`) requires `assertMutationAccess`, which blocks DRAFT businesses. Dashboard service creation behavior (OWNER/MANAGER via `assertMutationAccess`) is unchanged. Admin-created services are identical in shape and behavior to dashboard-created services.

8. **Business user creation — admin/ops during DRAFT phase:** Platform admins can add MANAGER or MEMBER users to any business regardless of status via `POST /admin/businesses/:businessId/users`. OWNER role is blocked at DTO validation (enum accepts only MANAGER and MEMBER). Created `BusinessUser` is immediately `status: ACTIVE` — no invitation flow. This is an onboarding convenience endpoint because dashboard user creation (`POST /dashboard/businesses/:businessId/users`) uses `assertOwnerAccess`, which blocks DRAFT businesses. Dashboard user creation behavior (OWNER only via `assertOwnerAccess`) is unchanged.

9. **Business working hours — admin/ops during DRAFT phase:** Platform admins can set business working hours for any business regardless of status via `PUT /admin/businesses/:businessId/working-hours`. Full-week replacement semantics: replaces all existing rows. Required for the `hasBusinessWorkingHours` readiness check before DRAFT→TRIAL. Dashboard working-hours endpoint behavior (OWNER/MANAGER via `assertMutationAccess`) is unchanged. This does not enable public booking.

10. **ServiceProvider working hours — admin/ops during DRAFT phase:** Platform admins can set working hours for any ServiceProvider regardless of business status via `PUT /admin/businesses/:businessId/service-providers/:serviceProviderId/working-hours`. SP must exist and belong to the business (cross-tenant access returns 404). Full-week replacement semantics. Required for the `allActiveProvidersHaveWorkingHours` readiness check before DRAFT→TRIAL. Dashboard SP working-hours endpoint behavior (OWNER/MANAGER via `assertMutationAccess`) is unchanged. This does not enable public booking.

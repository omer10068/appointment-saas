# Role and Permission Model

## Two Separate Concepts

### 1. BusinessUser

A user who has dashboard/system access to a business. Controlled by `BusinessUser.role`.

### 2. StaffMember

A bookable staff/service provider entity that appears in the calendar and can receive appointments. A `StaffMember` is linked to a `BusinessUser` but is a separate concept — a `BusinessUser` with `MEMBER` role may or may not have a corresponding `StaffMember` profile.

These are not the same thing. `BusinessUser.role` controls dashboard permissions. `StaffMember` controls booking/calendar assignment.

---

## BusinessUser Roles

### OWNER

Full control over the business.

**Can:**

- Manage business settings
- Manage services
- Manage customers
- Manage appointments
- Manage staff members
- Manage working hours
- Manage availability exceptions
- Invite/remove MANAGER users
- Invite/remove MEMBER users
- Change user roles
- Access dashboard data
- Future: billing/subscription/ownership operations

### MANAGER

Operational manager.

**Can:**

- Manage services
- Manage customers
- Manage appointments
- Manage staff members
- Manage working hours
- Manage availability exceptions
- Access dashboard data

**Cannot:**

- Invite/remove users
- Change user roles
- Transfer ownership
- Manage billing/subscription
- Delete/suspend business

### MEMBER

Basic operational user with read access and limited write access.

**Can:**

- View dashboard data
- View services
- View customers
- View staff members
- View appointments
- Create appointments (current implementation allows this)
- Change appointment status (current implementation allows this)

**Cannot:**

- Manage users
- Change roles
- Create/edit/delete services
- Create/edit/delete staff members
- Manage working hours
- Manage availability exceptions
- Manage business settings
- Manage billing/subscription
- Delete/suspend business

---

## Permission Matrix

| Capability                           | OWNER | MANAGER | MEMBER |
|--------------------------------------|:-----:|:-------:|:------:|
| View business dashboard              | yes   | yes     | yes    |
| View services                        | yes   | yes     | yes    |
| Create/update/delete services        | yes   | yes     | no     |
| View customers                       | yes   | yes     | yes    |
| Create/update customers              | yes   | yes     | no     |
| Block/archive customers              | yes   | yes     | no     |
| View appointments                    | yes   | yes     | yes    |
| Create appointments                  | yes   | yes     | yes    |
| Update appointment details           | yes   | yes     | no     |
| Change appointment status            | yes   | yes     | yes    |
| View staff members                   | yes   | yes     | yes    |
| Create/update/delete staff members   | yes   | yes     | no     |
| View working hours                   | yes   | yes     | yes    |
| Update working hours                 | yes   | yes     | no     |
| Manage availability exceptions       | yes   | yes     | no     |
| View business users                  | yes   | no      | no     |
| Invite MEMBER                        | yes   | no      | no     |
| Invite MANAGER                       | yes   | no      | no     |
| Remove business users                | yes   | no      | no     |
| Change business user roles           | yes   | no      | no     |
| Business settings                    | yes   | no      | no     |
| Billing/subscription                 | yes   | no      | no     |

---

## Permission Gaps / Follow-up Tasks

The table above reflects intended permissions. The following gaps exist between intent and current implementation:

1. **MEMBER — create appointments**: The current `assertMutationAccess` check blocks non-OWNER/MANAGER on services, customers, and staff mutations, but appointment creation currently uses the same guard. Verify whether MEMBER should be allowed to create appointments and adjust accordingly if needed.

2. **MEMBER — change appointment status**: Same as above — the status update endpoint should be reviewed to confirm MEMBER access intent.

3. **MANAGER — view business users**: Currently not verified in tests. Confirm whether MANAGER can list business users or not.

4. **Invite/remove users**: Currently only OWNER is implemented as the role that can call `createBusinessUser`. MANAGER is blocked by `assertMutationAccess`. This aligns with the table above.

5. **StaffMember → ServiceProvider rename**: `StaffMember` is currently used as both a bookable entity concept and loosely associated with the `MEMBER` role. A future task will rename `StaffMember` to `ServiceProvider` to fully decouple these concepts.

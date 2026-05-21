# Role and Permission Model

## Two Separate Concepts

### 1. BusinessUser

A user who has dashboard/system access to a business. Controlled by `BusinessUser.role`.

### 2. ServiceProvider

A bookable entity that appears in the calendar and can receive appointments. A `ServiceProvider` is linked to a `BusinessUser` but is a separate concept — a `BusinessUser` with `MEMBER` role may or may not have a corresponding `ServiceProvider` profile.

These are not the same thing. `BusinessUser.role` controls dashboard permissions. `ServiceProvider` controls booking/calendar assignment.

---

## BusinessUser Roles

### OWNER

Full control over the business.

**Can:**

- Manage business settings
- Manage services
- Manage customers
- Manage appointments
- Manage service providers
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
- Manage service providers
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

Basic operational user with read access.

**Can:**

- View dashboard data
- View services
- View customers
- View service providers
- View appointments

**Pending decision — not yet finalized:**

- Create appointments
- Change appointment status

**Cannot:**

- Manage users
- Change roles
- Create/edit/delete services
- Create/edit/delete service providers
- Create/update customers
- Block/archive customers
- Update appointment details
- Manage working hours
- Manage availability exceptions
- Manage business settings
- Manage billing/subscription
- Delete/suspend business

---

## Permission Matrix

| Capability                             | OWNER | MANAGER | MEMBER |
|----------------------------------------|:-----:|:-------:|:------:|
| View business dashboard                | yes   | yes     | yes    |
| View services                          | yes   | yes     | yes    |
| Create/update/delete services          | yes   | yes     | no     |
| View customers                         | yes   | yes     | yes    |
| Create/update customers                | yes   | yes     | no     |
| Block/archive customers                | yes   | yes     | no     |
| View appointments                      | yes   | yes     | yes    |
| Create appointments                    | yes   | yes     | TBD    |
| Update appointment details             | yes   | yes     | no     |
| Change appointment status              | yes   | yes     | TBD    |
| View service providers                 | yes   | yes     | yes    |
| Create/update/delete service providers | yes   | yes     | no     |
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

1. **MEMBER — create appointments**: Not yet decided. Appointment mutation e2e tests have not been written. Review the appointment creation endpoint guard before finalizing MEMBER access.

2. **MEMBER — change appointment status**: Not yet decided. Same as above — the appointment status endpoint guard must be reviewed and a decision documented before implementation.

3. **View business users — verified behavior**: `GET /dashboard/businesses/:businessId/users` is OWNER-only (`assertOwnerAccess`). MANAGER, MEMBER, and outsiders receive 403. Missing auth receives 401. This matches the permission matrix.

4. **Invite/create users**: Currently only OWNER can call the business user invite/create endpoint. MANAGER is blocked. This aligns with the table above.

5. **Remove users / role management follow-up**: MANAGER currently cannot invite, remove, or change roles. Confirm whether this restriction is permanent or if MANAGER should gain limited user-management capability in a future iteration.

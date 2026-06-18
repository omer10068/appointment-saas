# Admin/Ops Onboarding Runbook

## Purpose

This runbook documents how to manually onboard a new business into the internal Business App / calendar MVP using backend endpoints only.

There is no Admin UI. All steps are HTTP API calls authenticated with an Admin token.

**Scope for current MVP:**

- The goal is to set up the internal Business App so the owner and their team can manage appointments manually.
- Public booking is **not** part of the current MVP.
- `publicBookingEnabled` must remain `false` throughout. Do not set it.
- `status = ACTIVE` means the business can use the internal Business App. It does **not** mean public booking is live.

---

## Target Business Shape

This runbook covers the first-pilot supported shape:

| Entity | Count | Notes |
|--------|-------|-------|
| Business | 1 | Created as DRAFT; promoted to TRIAL then ACTIVE |
| OWNER | 1 | Primary contact; has full dashboard access |
| MANAGER | 1 | Second partner; has operational dashboard access |
| ServiceProvider/calendar | 2 | One per partner; each is a bookable calendar |
| Services | 2+ | Can differ per provider; each provider needs ≥ 1 active service |
| Business working hours | 1 set | Full-week schedule for the business |
| Provider working hours | 1 set per provider | Each provider needs their own schedule |

---

## Preconditions

Confirm the following before starting:

- [ ] Admin or Super Admin auth token is available
- [ ] Business name and URL-safe slug are chosen (e.g. `my-salon`)
- [ ] Business timezone is known (e.g. `Asia/Jerusalem`, `America/New_York`)
- [ ] Primary owner's phone number is known (E.164, e.g. `+972501234567`)
- [ ] Second partner's phone number is known
- [ ] Service list is agreed (name + duration in minutes for each)
- [ ] Business working hours are agreed (days + open/close times)
- [ ] Each provider's working hours are agreed
- [ ] Email addresses are optional but recommended

---

## Important Concepts

| Concept | Meaning |
|---------|---------|
| `BusinessUser` | Represents a person's access to a business. Controls their role (OWNER / MANAGER / MEMBER) and dashboard access. |
| `ServiceProvider` | A bookable calendar entity. Receives appointments. One-to-one with a `BusinessUser`. |
| `BusinessUser.id` | The ID of the membership row — **not** the same as the `User.id`. Required when creating a `ServiceProvider`. |
| OWNER | Created via the dedicated `/owner` endpoint. Only one OWNER per business. |
| MANAGER | Created via the generic `/users` endpoint. Has operational access (services, customers, appointments, working hours). Cannot manage users or billing. |
| DRAFT | Business is being configured. Dashboard is **locked** for all users. |
| TRIAL | Dashboard access unlocked. Public booking still blocked. |
| ACTIVE | Full operational status. Still no public booking unless `publicBookingEnabled = true` (not for MVP). |
| `publicBookingEnabled` | Independent flag. Do not set it during MVP onboarding. |

**Key dependency:** ServiceProvider creation requires a valid `BusinessUser.id`. The owner and manager must exist as BusinessUsers before their ServiceProvider calendars can be created.

---

## Step-by-Step Onboarding Flow

All endpoints require:
```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Base URL: `https://{{api-host}}`

---

### Step 1 — Create Business as DRAFT

```
POST /admin/businesses
```

**Request body:**
```json
{
  "name": "My Salon",
  "slug": "my-salon",
  "timezone": "Asia/Jerusalem"
}
```

**Key fields to capture from response:**

| Field | Variable | Notes |
|-------|----------|-------|
| `id` | `{{businessId}}` | Required for all subsequent steps |
| `slug` | — | Verify it matches |
| `status` | — | Must be `"DRAFT"` |
| `publicBookingEnabled` | — | Must be `false` |

**Pitfalls:**
- `slug` must be lowercase, URL-safe, and globally unique (e.g. `my-salon`, not `My Salon`). Duplicate slug → 409.
- `timezone` is required and must be a valid IANA timezone string.
- Status is automatically forced to `DRAFT` — do not attempt to pass a different status.

---

### Step 2 — Create First OWNER

```
POST /admin/businesses/{{businessId}}/owner
```

**Request body:**
```json
{
  "phone": "+972501234567",
  "email": "owner@example.com"
}
```

**Key fields to capture from response:**

| Field | Variable | Notes |
|-------|----------|-------|
| `id` | `{{ownerBusinessUserId}}` | This is the `BusinessUser.id`, NOT the `User.id` |
| `role` | — | Must be `"OWNER"` |
| `status` | — | Must be `"ACTIVE"` |

**Pitfalls:**
- Only one OWNER per business. A second call to this endpoint → 409.
- The `id` in the response is the `BusinessUser.id`. Save it as `{{ownerBusinessUserId}}`. You will need it in Step 6 to create the provider.
- Phone is normalized to E.164 internally. If the user already exists in the system (by phone or email), they will be linked rather than duplicated.

---

### Step 3 — Add Second Partner as MANAGER

```
POST /admin/businesses/{{businessId}}/users
```

**Request body:**
```json
{
  "phone": "+972509876543",
  "email": "manager@example.com",
  "role": "MANAGER"
}
```

**Key fields to capture from response:**

| Field | Variable | Notes |
|-------|----------|-------|
| `id` | `{{managerBusinessUserId}}` | This is the `BusinessUser.id`, NOT the `User.id` |
| `role` | — | Must be `"MANAGER"` |
| `status` | — | Must be `"ACTIVE"` |

**Pitfalls:**
- `role` must be `"MANAGER"` or `"MEMBER"`. `"OWNER"` is rejected by this endpoint (use Step 2 for owner).
- The same phone lookup applies: if the user already exists in the system they are linked automatically.
- Same-user-same-business duplicate → 409.

---

### Step 4 — Create Services

Repeat for each service.

```
POST /admin/businesses/{{businessId}}/services
```

**Request body (example — service A):**
```json
{
  "name": "Haircut",
  "durationMinutes": 45,
  "priceCents": 15000,
  "description": "Standard haircut service"
}
```

**Request body (example — service B):**
```json
{
  "name": "Hair Coloring",
  "durationMinutes": 120,
  "priceCents": 35000
}
```

**Key fields to capture from each response:**

| Field | Variable |
|-------|----------|
| `id` | `{{serviceAId}}`, `{{serviceBId}}`, … |
| `isActive` | Must be `true` for readiness |

**Pitfalls:**
- `durationMinutes` must be between 5 and 480.
- `priceCents` is optional; omit for free services.
- Default `isActive` is `true`. Only pass `"isActive": false` if intentionally creating an inactive service.
- An active ServiceProvider cannot be linked to an inactive service. Get this right before Step 6.

---

### Step 5 — Create ServiceProviders / Calendars

Create one ServiceProvider per partner. Each provider is a bookable calendar.

**Important: `businessUserId` is the `BusinessUser.id` from Steps 2 and 3 — not the `User.id`.**

**Provider A — for the OWNER:**

```
POST /admin/businesses/{{businessId}}/service-providers
```

```json
{
  "displayName": "Dana Cohen",
  "businessUserId": "{{ownerBusinessUserId}}",
  "serviceIds": ["{{serviceAId}}"]
}
```

**Provider B — for the MANAGER:**

```
POST /admin/businesses/{{businessId}}/service-providers
```

```json
{
  "displayName": "Yael Levy",
  "businessUserId": "{{managerBusinessUserId}}",
  "serviceIds": ["{{serviceBId}}"]
}
```

**Key fields to capture from each response:**

| Field | Variable |
|-------|----------|
| `id` | `{{providerAId}}`, `{{providerBId}}` |
| `serviceIds` | Verify correct services are linked |
| `isActive` | Must be `true` |

**Pitfalls:**
- `businessUserId` must be the `BusinessUser.id` (the membership row ID), **not** the `User.id`. This is the most common mistake. Both look like UUIDs.
- Each `BusinessUser` can have at most one `ServiceProvider`. Duplicate → 409.
- `serviceIds` must contain at least one entry. All service IDs must belong to this business and be active if `isActive: true`.
- If a provider should offer multiple services, pass all IDs: `"serviceIds": ["{{serviceAId}}", "{{serviceBId}}"]`.

---

### Step 6 — Set Business Working Hours

This sets the general schedule for the business. It does **not** set provider-specific hours.

```
PUT /admin/businesses/{{businessId}}/working-hours
```

**Example — Mon–Fri 09:00–18:00, closed Sat/Sun:**

```json
{
  "hours": [
    { "dayOfWeek": 0, "isClosed": true },
    { "dayOfWeek": 1, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 2, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 3, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 4, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 5, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 6, "isClosed": true }
  ]
}
```

Day-of-week reference: 0 = Sunday, 1 = Monday, … 6 = Saturday.

**Notes:**
- This is a full replacement. Sending it again overwrites all previous rows.
- `isClosed: true` rows count toward `hasBusinessWorkingHours` — any row (even a closed day) satisfies the readiness check. Best practice is to send a complete 7-day week.
- Time format must be `HH:mm` (24-hour, zero-padded): `"09:00"` not `"9:00"`.
- `endTime` must be strictly after `startTime`.

---

### Step 7 — Set Each Provider's Working Hours

Repeat for each provider. Provider working hours are independent of business working hours.

**Provider A:**

```
PUT /admin/businesses/{{businessId}}/service-providers/{{providerAId}}/working-hours
```

```json
{
  "hours": [
    { "dayOfWeek": 1, "isClosed": false, "startTime": "09:00", "endTime": "17:00" },
    { "dayOfWeek": 2, "isClosed": false, "startTime": "09:00", "endTime": "17:00" },
    { "dayOfWeek": 3, "isClosed": false, "startTime": "09:00", "endTime": "17:00" }
  ]
}
```

**Provider B:**

```
PUT /admin/businesses/{{businessId}}/service-providers/{{providerBId}}/working-hours
```

```json
{
  "hours": [
    { "dayOfWeek": 2, "isClosed": false, "startTime": "10:00", "endTime": "18:00" },
    { "dayOfWeek": 4, "isClosed": false, "startTime": "10:00", "endTime": "18:00" },
    { "dayOfWeek": 5, "isClosed": false, "startTime": "10:00", "endTime": "18:00" }
  ]
}
```

**Notes:**
- Every active ServiceProvider must have at least one working-hours row for `allActiveProvidersHaveWorkingHours` to pass.
- Same full-replacement semantics: sending again overwrites all rows for that provider.
- You do not need to send all 7 days — only the days they work.

---

### Step 8 — Verify Onboarding Summary

Before transitioning status, do a full sanity check.

```
GET /admin/businesses/{{businessId}}/onboarding-summary
```

**Expected response shape (verify each field):**

```json
{
  "business": {
    "id": "{{businessId}}",
    "status": "DRAFT",
    "publicBookingEnabled": false
  },
  "users": [
    { "role": "OWNER", "status": "ACTIVE", "user": { "phone": "+972501234567" } },
    { "role": "MANAGER", "status": "ACTIVE", "user": { "phone": "+972509876543" } }
  ],
  "services": [
    { "id": "{{serviceAId}}", "name": "Haircut", "isActive": true },
    { "id": "{{serviceBId}}", "name": "Hair Coloring", "isActive": true }
  ],
  "serviceProviders": [
    {
      "id": "{{providerAId}}",
      "displayName": "Dana Cohen",
      "isActive": true,
      "serviceIds": ["{{serviceAId}}"],
      "hasWorkingHours": true
    },
    {
      "id": "{{providerBId}}",
      "displayName": "Yael Levy",
      "isActive": true,
      "serviceIds": ["{{serviceBId}}"],
      "hasWorkingHours": true
    }
  ],
  "businessWorkingHours": [ ... ],
  "readiness": {
    "isReady": true,
    "blockingReasons": []
  }
}
```

**Checklist:**
- [ ] `business.status` is `"DRAFT"`
- [ ] `business.publicBookingEnabled` is `false`
- [ ] Both users present with `status: "ACTIVE"`
- [ ] Both services present with `isActive: true`
- [ ] Both providers present with `isActive: true`
- [ ] Each provider's `serviceIds` contains only the intended service(s)
- [ ] Both providers have `hasWorkingHours: true`
- [ ] `businessWorkingHours` is non-empty
- [ ] `readiness.isReady` is `true`

If `isReady` is `false`, check `blockingReasons` — see the Troubleshooting section below.

---

### Step 9 — Verify Readiness Directly

```
GET /admin/businesses/{{businessId}}/readiness
```

**Expected response:**

```json
{
  "isReady": true,
  "checks": {
    "hasActiveOwner": true,
    "hasActiveService": true,
    "hasActiveServiceProvider": true,
    "hasBusinessWorkingHours": true,
    "allActiveProvidersHaveWorkingHours": true,
    "allActiveProvidersHaveActiveServiceAssignment": true,
    "allActiveServicesHaveActiveProviderAssignment": true
  },
  "blockingReasons": []
}
```

All 7 checks must be `true` before proceeding to Step 11.

---

### Step 10 — Move DRAFT → TRIAL

```
PATCH /admin/businesses/{{businessId}}/status
```

```json
{ "status": "TRIAL" }
```

**Expected response:** full Business object with `status: "TRIAL"` and `publicBookingEnabled: false`.

**What this does:**
- Unlocks dashboard access for all ACTIVE BusinessUsers (OWNER, MANAGER).
- The owner and manager can now log in to the Business App.
- Does **not** enable public booking.
- Does **not** check readiness — TRIAL is the onboarding state, not the live state. You can move to TRIAL before the business is fully ready and complete setup through the dashboard.

---

### Step 11 — Move TRIAL → ACTIVE

```
PATCH /admin/businesses/{{businessId}}/status
```

```json
{ "status": "ACTIVE" }
```

**Expected response:** full Business object with `status: "ACTIVE"` and `publicBookingEnabled: false`.

**What this does:**
- Confirms the business is fully operational.
- Requires all 7 readiness checks to be `true`. If not → 400 with `blockingReasons`.
- Does **not** enable public booking. `publicBookingEnabled` remains `false`.

**Notes:**
- DRAFT → ACTIVE directly is blocked (must go through TRIAL first).
- If readiness fails here, use the dashboard (available since TRIAL) to fix the issue, then retry.

---

### Step 12 — Confirm publicBookingEnabled Remains False

Verify the final state:

```
GET /admin/businesses/{{businessId}}/onboarding-summary
```

Confirm:
- `business.status` is `"ACTIVE"`
- `business.publicBookingEnabled` is `false`
- `readiness.isReady` is `true`

**Do not call `PATCH /admin/businesses/:id/public-booking` during MVP onboarding.** Public booking is not part of the current MVP.

---

## Example Payloads Reference

### Create Business

```json
POST /admin/businesses
{
  "name": "My Salon",
  "slug": "my-salon",
  "timezone": "Asia/Jerusalem"
}
```

### Create Owner

```json
POST /admin/businesses/{{businessId}}/owner
{
  "phone": "+972501234567",
  "email": "owner@example.com"
}
```

### Add Manager

```json
POST /admin/businesses/{{businessId}}/users
{
  "phone": "+972509876543",
  "email": "manager@example.com",
  "role": "MANAGER"
}
```

### Create Service

```json
POST /admin/businesses/{{businessId}}/services
{
  "name": "Haircut",
  "durationMinutes": 45,
  "priceCents": 15000
}
```

### Create ServiceProvider

```json
POST /admin/businesses/{{businessId}}/service-providers
{
  "displayName": "Dana Cohen",
  "businessUserId": "{{ownerBusinessUserId}}",
  "serviceIds": ["{{serviceAId}}"]
}
```

### Set Business Working Hours

```json
PUT /admin/businesses/{{businessId}}/working-hours
{
  "hours": [
    { "dayOfWeek": 0, "isClosed": true },
    { "dayOfWeek": 1, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 2, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 3, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 4, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 5, "isClosed": false, "startTime": "09:00", "endTime": "18:00" },
    { "dayOfWeek": 6, "isClosed": true }
  ]
}
```

### Set Provider Working Hours

```json
PUT /admin/businesses/{{businessId}}/service-providers/{{providerId}}/working-hours
{
  "hours": [
    { "dayOfWeek": 1, "isClosed": false, "startTime": "09:00", "endTime": "17:00" },
    { "dayOfWeek": 3, "isClosed": false, "startTime": "09:00", "endTime": "17:00" }
  ]
}
```

### Status Transitions

```json
PATCH /admin/businesses/{{businessId}}/status
{ "status": "TRIAL" }
```

```json
PATCH /admin/businesses/{{businessId}}/status
{ "status": "ACTIVE" }
```

---

## Common Mistakes

### Passing `User.id` instead of `BusinessUser.id` to ServiceProvider creation

The `createOwner` and `addBusinessUser` responses both contain an `id` field **and** a `userId` field.

- `id` = `BusinessUser.id` — **use this** as `businessUserId` when creating a ServiceProvider.
- `userId` = `User.id` — this is the identity record. Do not pass this to ServiceProvider creation.

Both are UUIDs. The error you get if you pass the wrong one is `400 BusinessUser does not belong to this business`.

### Forgetting provider working hours for one provider

`allActiveProvidersHaveWorkingHours` fails if **any** active provider has zero working-hours rows. Double-check both providers after Step 7. The onboarding summary `hasWorkingHours` field per provider makes this easy to spot.

### Creating an active provider linked to an inactive service

Active ServiceProviders must be linked to active services. If a service was created with `isActive: false`, either recreate it as active or use the dashboard after TRIAL to activate it.

### Moving to TRIAL too early

TRIAL unlocks the dashboard. If you move to TRIAL before the business is fully configured, the owner can log in and see incomplete data. This is not a hard error, but confusing. Complete Steps 1–9 before Step 10 when possible.

### Assuming ACTIVE means public booking is live

`status = ACTIVE` means the business can use the internal Business App. It has no effect on public booking. Public booking requires a separate `PATCH /admin/businesses/:id/public-booking` call (`publicBookingEnabled: true`), which is **not part of the current MVP**.

### Enabling publicBookingEnabled accidentally

Do not call `PATCH /admin/businesses/:id/public-booking`. Leave it alone.

### Relying on dashboard endpoints while business is still DRAFT

All dashboard endpoints (`/dashboard/businesses/:id/...`) require the business to be `ACTIVE` or `TRIAL`. They return `403` for DRAFT businesses. Use admin endpoints (`/admin/businesses/:id/...`) for all configuration during DRAFT.

---

## Troubleshooting Readiness

When `readiness.isReady` is `false`, `blockingReasons` lists the failing checks. Map each reason to its fix:

| Blocking reason | Fix |
|----------------|-----|
| `No active owner` | Create an owner via `POST /admin/businesses/:id/owner` |
| `No active service` | Create an active service via `POST /admin/businesses/:id/services` |
| `No active service provider` | Create an active ServiceProvider via `POST /admin/businesses/:id/service-providers` |
| `No business working hours configured` | Set business working hours via `PUT /admin/businesses/:id/working-hours` |
| `One or more active service providers have no working hours` | Identify which provider(s) have `hasWorkingHours: false` in the onboarding summary, then call `PUT /admin/businesses/:id/service-providers/:spId/working-hours` for each |
| `One or more active service providers have no active service assignment` | The affected provider has no active service linked. Recreate or re-link via dashboard after moving to TRIAL |
| `One or more active services have no active service provider assignment` | The affected service is not linked to any active provider. Check provider `serviceIds` in the onboarding summary |

After fixing each issue, call `GET /admin/businesses/:id/readiness` again to verify.

---

## Current Limitations

- **No Admin UI.** All steps are raw HTTP calls. Use Postman, curl, or a similar tool.
- **No public booking in MVP.** `publicBookingEnabled` must remain `false`.
- **No public appointment creation.** Customers book through the Business App only (manual, by owner/manager).
- **No onboarding automation.** This runbook is the process.
- **No multiple OWNERs.** Exactly one OWNER per business.
- **Corrections during DRAFT are limited.** If you need to fix a service name/duration, a service-provider assignment, or business metadata (name/timezone) after creation and while the business is still in DRAFT, Phase C endpoints do not exist yet. Options:
  - Move to TRIAL first (dashboard unlocks, enabling corrections via the Business App).
  - Recreate the entity (delete + recreate via admin endpoints for services; working hours support full replacement already).
  - Direct DB fix as a last resort.
- **Working-hours conflict checks are intentionally skipped** in the admin Phase B endpoints (`PUT .../working-hours`). These endpoints are designed for DRAFT-phase setup where no appointments exist. For TRIAL/ACTIVE businesses with existing appointments, use the dashboard endpoints, which do enforce conflict checks.

---

## Related Tests

The full onboarding sequence is covered by an automated E2E test:

- **File:** `apps/api/test/e2e/admin-businesses.e2e-spec.ts`
- **Suite:** `describe('Full two-partner onboarding happy path (DRAFT → ACTIVE)')`

This test mirrors this runbook exactly. If any step in this runbook fails against the API, running that E2E test is the first debugging tool.

---

## Related Documentation

- [`docs/backend-roadmap.md`](./backend-roadmap.md) — backend implementation status and phase history
- [`docs/rbac.md`](./rbac.md) — role and permission model reference
- [`docs/architecture.md`](./architecture.md) — system architecture overview

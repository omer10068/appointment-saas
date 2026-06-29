import { computeTimelineRange } from '../timeline-range';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a UTC Date at exactly HH:MM on 2025-01-01. */
function utcDate(hour: number, minute = 0): Date {
  return new Date(
    `2025-01-01T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
  );
}

function appt(startH: number, endH: number, startM = 0, endM = 0) {
  return { startTime: utcDate(startH, startM), endTime: utcDate(endH, endM) };
}

// All tests use UTC so "minutes from midnight" == the UTC hour × 60 + UTC minute.
const TZ = 'UTC';

// ─── Fallback range ───────────────────────────────────────────────────────────

describe('fallback when no data', () => {
  it('returns 08:00 start when no appointments and no business hours', () => {
    const { startMin } = computeTimelineRange([], TZ);
    expect(startMin).toBe(8 * 60);
  });

  it('returns at least 20:00 end when no appointments and no business hours', () => {
    const { endMin } = computeTimelineRange([], TZ);
    expect(endMin).toBeGreaterThanOrEqual(20 * 60);
  });

  it('end is a 30-minute boundary + buffer (20:00 → 20:30)', () => {
    const { endMin } = computeTimelineRange([], TZ);
    expect(endMin % 30).toBe(0);
    expect(endMin).toBe(20 * 60 + 30);
  });
});

// ─── Business hours anchor the grid ──────────────────────────────────────────

describe('business hours anchor the grid', () => {
  it('grid extends to at least 17:00 when business closes at 17:00', () => {
    const { endMin } = computeTimelineRange([], TZ, [
      { startTime: '09:00', endTime: '17:00' },
    ]);
    expect(endMin).toBeGreaterThanOrEqual(17 * 60);
  });

  it('grid extends past 21:00 when business closes at 21:00', () => {
    const { endMin } = computeTimelineRange([], TZ, [
      { startTime: '09:00', endTime: '21:00' },
    ]);
    expect(endMin).toBeGreaterThan(21 * 60);
    expect(endMin).toBe(21 * 60 + 30); // 21:00 rounded-up (already on boundary) + 1 buffer slot
  });

  it('grid start is pulled early when business opens at 07:00', () => {
    const { startMin } = computeTimelineRange([], TZ, [
      { startTime: '07:00', endTime: '17:00' },
    ]);
    expect(startMin).toBe(7 * 60);
  });

  it('multiple business-hour windows: grid spans the union', () => {
    const { startMin, endMin } = computeTimelineRange([], TZ, [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '21:00' },
    ]);
    expect(startMin).toBe(9 * 60);
    expect(endMin).toBeGreaterThan(21 * 60);
  });
});

// ─── Appointments extend the range ───────────────────────────────────────────

describe('appointments extend the range', () => {
  it('appointment at 21:00–21:30 is not clipped (endMin > 21:30)', () => {
    const { endMin } = computeTimelineRange([appt(21, 21, 0, 30)], TZ);
    expect(endMin).toBeGreaterThan(21 * 60 + 30);
  });

  it('appointment at 21:00–22:00 is fully visible (endMin > 22:00)', () => {
    const { endMin } = computeTimelineRange([appt(21, 22)], TZ);
    expect(endMin).toBeGreaterThan(22 * 60);
    // Rounded up to 22:00 (already on boundary) + 1 buffer slot = 22:30
    expect(endMin).toBe(22 * 60 + 30);
  });

  it('appointment start pulls grid start earlier', () => {
    const { startMin } = computeTimelineRange([appt(6, 7)], TZ);
    expect(startMin).toBe(6 * 60);
  });

  it('late appointment overrides business-hours end', () => {
    // Business closes at 17:00 but an existing appointment runs until 19:00
    const { endMin } = computeTimelineRange(
      [appt(18, 19)],
      TZ,
      [{ startTime: '09:00', endTime: '17:00' }],
    );
    expect(endMin).toBeGreaterThan(19 * 60);
    expect(endMin).toBe(19 * 60 + 30);
  });

  it('cancelled / historical appointment outside business hours remains visible', () => {
    // Business hours changed to 9–17 but there's a legacy appt at 18:00–19:00
    const { endMin } = computeTimelineRange(
      [appt(18, 19)],
      TZ,
      [{ startTime: '09:00', endTime: '17:00' }],
    );
    // Grid must go past 19:00 so the appointment is not clipped
    expect(endMin).toBeGreaterThan(19 * 60);
  });
});

// ─── All-team mode ────────────────────────────────────────────────────────────

describe('all-team mode', () => {
  it('covers the latest appointment across all providers', () => {
    const { endMin } = computeTimelineRange(
      [
        appt(9, 10),   // provider A
        appt(10, 11),  // provider B
        appt(20, 21),  // provider C — latest
      ],
      TZ,
      [{ startTime: '08:00', endTime: '18:00' }],
    );
    expect(endMin).toBeGreaterThan(21 * 60);
  });

  it('picks the earliest start across all providers', () => {
    const { startMin } = computeTimelineRange(
      [
        appt(9, 10),
        appt(7, 8),  // earliest
        appt(10, 11),
      ],
      TZ,
    );
    expect(startMin).toBe(7 * 60);
  });
});

// ─── Single-provider filtered mode ───────────────────────────────────────────

describe('single-provider filtered mode', () => {
  it('range matches filtered appointment set only', () => {
    // Caller pre-filters — pass only the selected provider's appointments
    const { endMin } = computeTimelineRange(
      [appt(10, 11)], // only provider A's appointments
      TZ,
      [{ startTime: '08:00', endTime: '21:00' }],
    );
    // Business hours extend to 21:00, so grid still covers 21:00
    expect(endMin).toBeGreaterThan(21 * 60);
  });
});

// ─── Grid boundary rounding ───────────────────────────────────────────────────

describe('grid boundary rounding', () => {
  it('start rounds DOWN to the nearest 30-minute slot', () => {
    // Appointment starts at 08:45 → start should be 08:30
    const { startMin } = computeTimelineRange([appt(8, 9, 45, 0)], TZ);
    expect(startMin).toBe(8 * 60 + 30);
  });

  it('end rounds UP to the nearest 30-minute slot then adds buffer', () => {
    // Appointment ends at 20:10 → ceil to 20:30 + 30 = 21:00
    const { endMin } = computeTimelineRange([appt(9, 20, 0, 10)], TZ);
    expect(endMin).toBe(21 * 60);
  });

  it('start and end are always multiples of 30', () => {
    const { startMin, endMin } = computeTimelineRange([appt(7, 21, 23, 47)], TZ);
    expect(startMin % 30).toBe(0);
    expect(endMin   % 30).toBe(0);
  });
});

// ─── All Team mode ───────────────────────────────────────────────────────────
//
// In All Team mode the caller passes business hours (which contain all providers)
// plus the union of all visible appointments.

describe('All Team mode — explicit multi-provider scenarios', () => {
  it('timeline start is the earliest provider start across the team', () => {
    // Business: 09:00–21:00. Three providers: 09:00–17:00, 12:00–21:00, 10:00–19:00.
    // Provider hours are a subset of business hours (containment invariant).
    // Caller passes BUSINESS hours (union cover) and all appointments.
    const { startMin } = computeTimelineRange([], TZ, [
      { startTime: '09:00', endTime: '21:00' }, // business
    ]);
    expect(startMin).toBe(9 * 60);
  });

  it('timeline end is the latest provider end across the team', () => {
    // Business closes at 21:00 → grid must cover at least 21:00
    const { endMin } = computeTimelineRange([], TZ, [
      { startTime: '09:00', endTime: '21:00' },
    ]);
    expect(endMin).toBeGreaterThan(21 * 60);
  });

  it('latest appointment across all providers extends the range', () => {
    // Provider A has an appointment until 21:30 even though business closes at 21:00
    const { endMin } = computeTimelineRange(
      [appt(21, 21, 0, 30)], // 21:00–21:30
      TZ,
      [{ startTime: '09:00', endTime: '21:00' }],
    );
    expect(endMin).toBeGreaterThan(21 * 60 + 30);
  });

  it('union of three provider windows all covered by business hours', () => {
    // Provider A: 09:00–17:00, B: 12:00–21:00, C: 10:00–19:00 → union 09:00–21:00
    // Business hours capture this exactly
    const { startMin, endMin } = computeTimelineRange([], TZ, [
      { startTime: '09:00', endTime: '21:00' },
    ]);
    expect(startMin).toBe(9 * 60);
    expect(endMin).toBeGreaterThan(21 * 60);
  });

  it('all-team appointment from any provider is visible', () => {
    // Provider A: appointment 16:00–17:00, Provider B: appointment 20:00–21:00
    const { endMin } = computeTimelineRange(
      [appt(16, 17), appt(20, 21)],
      TZ,
      [{ startTime: '09:00', endTime: '21:00' }],
    );
    expect(endMin).toBeGreaterThan(21 * 60);
  });
});

// ─── Single-provider filtered mode (explicit) ─────────────────────────────────
//
// In single-provider mode the caller passes THAT provider's hours (not business hours)
// plus only that provider's appointments.

describe('Single-provider filtered mode — explicit scenarios', () => {
  it('range narrows to the selected provider\'s hours, not the full business window', () => {
    // Business: 09:00–21:00. Selected provider: 10:00–14:00.
    // In single-provider mode the caller passes provider hours only.
    const { startMin, endMin } = computeTimelineRange(
      [],
      TZ,
      [{ startTime: '10:00', endTime: '14:00' }], // provider hours
    );
    expect(startMin).toBe(10 * 60);
    expect(endMin).toBe(14 * 60 + 30); // 14:00 on boundary + 1 buffer
  });

  it('provider appointment outside their hours still visible', () => {
    // Provider's hours end at 17:00 but they have an appointment until 18:00
    const { endMin } = computeTimelineRange(
      [appt(17, 18)],
      TZ,
      [{ startTime: '09:00', endTime: '17:00' }],
    );
    expect(endMin).toBeGreaterThan(18 * 60);
  });

  it('single-provider range does not include other providers\' appointments', () => {
    // Caller pre-filters: only provider A's appointment (10:00–11:00) is passed
    const { startMin, endMin } = computeTimelineRange(
      [appt(10, 11)],
      TZ,
      [{ startTime: '10:00', endTime: '14:00' }],
    );
    // Should be anchored to provider hours, not extended by anyone else
    expect(startMin).toBe(10 * 60);
    expect(endMin).toBe(14 * 60 + 30); // provider end is the limiting factor
  });

  it('single-provider with no appointments falls back to their own hours', () => {
    const { startMin, endMin } = computeTimelineRange(
      [],
      TZ,
      [{ startTime: '13:00', endTime: '17:00' }],
    );
    expect(startMin).toBe(13 * 60);
    expect(endMin).toBe(17 * 60 + 30);
  });
});

// ─── No hard-coded 20:00 cutoff ──────────────────────────────────────────────

describe('no hard-coded 20:00 cutoff', () => {
  it('grid extends past 20:00 when an appointment ends at 21:00', () => {
    const { endMin } = computeTimelineRange([appt(20, 21)], TZ);
    expect(endMin).toBeGreaterThan(21 * 60);
  });

  it('grid extends past 20:00 when business hours reach 22:00', () => {
    const { endMin } = computeTimelineRange([], TZ, [
      { startTime: '08:00', endTime: '22:00' },
    ]);
    expect(endMin).toBeGreaterThan(22 * 60);
  });
});

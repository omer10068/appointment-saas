'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  CreateAvailabilityExceptionPayload,
  DashboardAvailabilityExceptionDto,
  DashboardServiceProviderDto,
  DashboardWorkingHourDto,
  UpdateWorkingHoursPayload,
} from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import {
  createAvailabilityException,
  deleteAvailabilityException,
  fetchAvailabilityExceptions,
  fetchBusinessWorkingHours,
  fetchDashboardServiceProviders,
  fetchServiceProviderWorkingHours,
  updateBusinessWorkingHours,
  updateServiceProviderWorkingHours,
} from '../../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HourRow {
  dayOfWeek: number;
  isClosed: boolean;
  startTime: string;
  endTime: string;
}

interface ExceptionForm {
  date: string;
  serviceProviderId: string;
  isClosed: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultHours(): HourRow[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isClosed: i === 5 || i === 6,
    startTime: '09:00',
    endTime: '17:00',
  }));
}

function mergeHours(
  loaded: DashboardWorkingHourDto[],
): HourRow[] {
  const base = defaultHours();
  const map = new Map(loaded.map((h) => [h.dayOfWeek, h]));
  return base.map((d) => {
    const l = map.get(d.dayOfWeek);
    if (!l) return d;
    return {
      dayOfWeek: l.dayOfWeek,
      isClosed: l.isClosed,
      startTime: l.startTime ?? '09:00',
      endTime: l.endTime ?? '17:00',
    };
  });
}

function emptyExceptionForm(): ExceptionForm {
  return {
    date: '',
    serviceProviderId: '',
    isClosed: true,
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
  };
}

function formatDate(isoDate: string): string {
  return isoDate.substring(0, 10);
}

// ─── Working Hours Editor ─────────────────────────────────────────────────────

function HoursEditor({
  rows,
  onChange,
  days,
  t,
}: {
  rows: HourRow[];
  onChange: (rows: HourRow[]) => void;
  days: string[];
  t: { open: string; closed: string; startTime: string; endTime: string };
}) {
  function update(dayOfWeek: number, patch: Partial<HourRow>) {
    onChange(
      rows.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.dayOfWeek}
          className="flex flex-wrap items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <span className="w-20 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">
            {days[row.dayOfWeek]}
          </span>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={row.isClosed}
              onChange={(e) =>
                update(row.dayOfWeek, { isClosed: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {row.isClosed ? t.closed : t.open}
            </span>
          </label>

          {!row.isClosed && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {t.startTime}
                </span>
                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) =>
                    update(row.dayOfWeek, { startTime: e.target.value })
                  }
                  className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {t.endTime}
                </span>
                <input
                  type="time"
                  value={row.endTime}
                  onChange={(e) =>
                    update(row.dayOfWeek, { endTime: e.target.value })
                  }
                  className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const { currentBusiness } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const ta = dict.availability;
  const p = dict.pages.availability;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const businessId = currentBusiness?.business.id;

  // ─── Business working hours ────────────────────────────────────────────────

  const [bizHours, setBizHours] = useState<HourRow[]>(defaultHours());
  const [bizHoursLoading, setBizHoursLoading] = useState(false);
  const [bizHoursSaving, setBizHoursSaving] = useState(false);
  const [bizHoursError, setBizHoursError] = useState<string | null>(null);
  const [bizHoursSuccess, setBizHoursSuccess] = useState<string | null>(null);

  // ─── Staff list + staff hours ──────────────────────────────────────────────

  const [staffList, setStaffList] = useState<DashboardServiceProviderDto[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffHours, setStaffHours] = useState<HourRow[]>(defaultHours());
  const [staffHoursLoading, setStaffHoursLoading] = useState(false);
  const [staffHoursSaving, setStaffHoursSaving] = useState(false);
  const [staffHoursError, setStaffHoursError] = useState<string | null>(null);
  const [staffHoursSuccess, setStaffHoursSuccess] = useState<string | null>(null);

  // ─── Availability exceptions ───────────────────────────────────────────────

  const [exceptions, setExceptions] = useState<DashboardAvailabilityExceptionDto[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [exceptionForm, setExceptionForm] = useState<ExceptionForm>(emptyExceptionForm());
  const [exceptionSaving, setExceptionSaving] = useState(false);
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const [exceptionSuccess, setExceptionSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Load on business change ───────────────────────────────────────────────

  useEffect(() => {
    if (!businessId) {
      setBizHours(defaultHours());
      setStaffList([]);
      setSelectedStaffId('');
      setStaffHours(defaultHours());
      setExceptions([]);
      setBizHoursError(null);
      setExceptionsLoading(false);
      return;
    }

    let cancelled = false;

    setBizHoursLoading(true);
    setBizHoursError(null);

    fetchBusinessWorkingHours(businessId, () => getTokenRef.current())
      .then((data) => { if (!cancelled) setBizHours(mergeHours(data)); })
      .catch(() => { if (!cancelled) setBizHoursError(ta.hoursLoadError); })
      .finally(() => { if (!cancelled) setBizHoursLoading(false); });

    setExceptionsLoading(true);
    fetchAvailabilityExceptions(businessId, () => getTokenRef.current())
      .then((data) => { if (!cancelled) setExceptions(data); })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setExceptionsLoading(false); });

    fetchDashboardServiceProviders(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) {
          setStaffList(data.filter((s) => s.isActive));
          setSelectedStaffId('');
          setStaffHours(defaultHours());
        }
      })
      .catch(() => { /* silent */ });

    return () => { cancelled = true; };
  }, [businessId, ta.hoursLoadError]);

  // ─── Load staff hours when staff selection changes ─────────────────────────

  useEffect(() => {
    if (!businessId || !selectedStaffId) {
      setStaffHours(defaultHours());
      return;
    }

    let cancelled = false;
    setStaffHoursLoading(true);
    setStaffHoursError(null);

    fetchServiceProviderWorkingHours(businessId, selectedStaffId, () => getTokenRef.current())
      .then((data) => { if (!cancelled) setStaffHours(mergeHours(data)); })
      .catch(() => { if (!cancelled) setStaffHoursError(ta.hoursLoadError); })
      .finally(() => { if (!cancelled) setStaffHoursLoading(false); });

    return () => { cancelled = true; };
  }, [businessId, selectedStaffId, ta.hoursLoadError]);

  // ─── Save business hours ───────────────────────────────────────────────────

  function showBizSuccess() {
    setBizHoursSuccess(ta.hoursSavedSuccess);
    setTimeout(() => setBizHoursSuccess(null), 3000);
  }

  function showStaffSuccess() {
    setStaffHoursSuccess(ta.hoursSavedSuccess);
    setTimeout(() => setStaffHoursSuccess(null), 3000);
  }

  function showExceptionSuccess(msg: string) {
    setExceptionSuccess(msg);
    setTimeout(() => setExceptionSuccess(null), 3000);
  }

  async function handleSaveBizHours() {
    if (!businessId) return;
    setBizHoursSaving(true);
    setBizHoursError(null);
    const payload: UpdateWorkingHoursPayload = {
      hours: bizHours.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        isClosed: r.isClosed,
        startTime: r.isClosed ? null : r.startTime,
        endTime: r.isClosed ? null : r.endTime,
      })),
    };
    try {
      const updated = await updateBusinessWorkingHours(
        businessId,
        payload,
        () => getTokenRef.current(),
      );
      setBizHours(mergeHours(updated));
      showBizSuccess();
    } catch {
      setBizHoursError(ta.hoursSaveError);
    } finally {
      setBizHoursSaving(false);
    }
  }

  async function handleSaveStaffHours() {
    if (!businessId || !selectedStaffId) return;
    setStaffHoursSaving(true);
    setStaffHoursError(null);
    const payload: UpdateWorkingHoursPayload = {
      hours: staffHours.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        isClosed: r.isClosed,
        startTime: r.isClosed ? null : r.startTime,
        endTime: r.isClosed ? null : r.endTime,
      })),
    };
    try {
      const updated = await updateServiceProviderWorkingHours(
        businessId,
        selectedStaffId,
        payload,
        () => getTokenRef.current(),
      );
      setStaffHours(mergeHours(updated));
      showStaffSuccess();
    } catch {
      setStaffHoursError(ta.hoursSaveError);
    } finally {
      setStaffHoursSaving(false);
    }
  }

  // ─── Add exception ─────────────────────────────────────────────────────────

  async function handleAddException(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId || !exceptionForm.date) return;
    setExceptionSaving(true);
    setExceptionError(null);
    const payload: CreateAvailabilityExceptionPayload = {
      date: exceptionForm.date,
      serviceProviderId: exceptionForm.serviceProviderId || null,
      isClosed: exceptionForm.isClosed,
      startTime: exceptionForm.isClosed ? null : exceptionForm.startTime || null,
      endTime: exceptionForm.isClosed ? null : exceptionForm.endTime || null,
      reason: exceptionForm.reason.trim() || null,
    };
    try {
      const created = await createAvailabilityException(
        businessId,
        payload,
        () => getTokenRef.current(),
      );
      setExceptions((prev) =>
        [...prev, created].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setExceptionForm(emptyExceptionForm());
      showExceptionSuccess(ta.exceptionCreatedSuccess);
    } catch {
      setExceptionError(ta.exceptionSaveError);
    } finally {
      setExceptionSaving(false);
    }
  }

  async function handleDeleteException(exceptionId: string) {
    if (!businessId) return;
    setDeletingId(exceptionId);
    try {
      await deleteAvailabilityException(
        businessId,
        exceptionId,
        () => getTokenRef.current(),
      );
      setExceptions((prev) => prev.filter((ex) => ex.id !== exceptionId));
      showExceptionSuccess(ta.exceptionDeletedSuccess);
    } catch {
      setExceptionError(ta.exceptionDeleteError);
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!currentBusiness) {
    return (
      <>
        <DashboardPageHeader title={p.title} description={p.description} />
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {dict.overview.noBusinessAssigned}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardPageHeader title={p.title} description={p.description} />

      <div className="space-y-6">

        {/* ── Business working hours ───────────────────────────────────── */}
        <SectionCard title={ta.businessHoursTitle}>
          {bizHoursLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <HoursEditor
                rows={bizHours}
                onChange={setBizHours}
                days={ta.days}
                t={ta}
              />

              {bizHoursError && (
                <p className="mt-3 text-sm text-red-500 dark:text-red-400">
                  {bizHoursError}
                </p>
              )}
              {bizHoursSuccess && (
                <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                  {bizHoursSuccess}
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void handleSaveBizHours()}
                  disabled={bizHoursSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40"
                >
                  {bizHoursSaving && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {ta.saveHours}
                </button>
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Staff working hours ──────────────────────────────────────── */}
        <SectionCard title={ta.staffHoursTitle}>
          {staffList.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {ta.noStaffForHours}
            </p>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {ta.selectStaffMember}
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— {ta.selectStaffMember} —</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStaffId && (
                staffHoursLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <HoursEditor
                      rows={staffHours}
                      onChange={setStaffHours}
                      days={ta.days}
                      t={ta}
                    />

                    {staffHoursError && (
                      <p className="mt-3 text-sm text-red-500 dark:text-red-400">
                        {staffHoursError}
                      </p>
                    )}
                    {staffHoursSuccess && (
                      <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                        {staffHoursSuccess}
                      </p>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => void handleSaveStaffHours()}
                        disabled={staffHoursSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40"
                      >
                        {staffHoursSaving && (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {ta.saveHours}
                      </button>
                    </div>
                  </>
                )
              )}
            </>
          )}
        </SectionCard>

        {/* ── Availability exceptions ──────────────────────────────────── */}
        <SectionCard title={ta.exceptionsTitle}>

          {/* Add exception form */}
          <form onSubmit={(e) => void handleAddException(e)} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {ta.date} *
                </label>
                <input
                  type="date"
                  required
                  value={exceptionForm.date}
                  onChange={(e) =>
                    setExceptionForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {ta.staffMemberLabel}
                </label>
                <select
                  value={exceptionForm.serviceProviderId}
                  onChange={(e) =>
                    setExceptionForm((f) => ({ ...f, serviceProviderId: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{ta.entireBusiness}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exceptionForm.isClosed}
                onChange={(e) =>
                  setExceptionForm((f) => ({ ...f, isClosed: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {ta.closed}
              </span>
            </label>

            {!exceptionForm.isClosed && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {ta.startTime}
                  </label>
                  <input
                    type="time"
                    value={exceptionForm.startTime}
                    onChange={(e) =>
                      setExceptionForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {ta.endTime}
                  </label>
                  <input
                    type="time"
                    value={exceptionForm.endTime}
                    onChange={(e) =>
                      setExceptionForm((f) => ({ ...f, endTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {ta.reason}
              </label>
              <input
                type="text"
                value={exceptionForm.reason}
                onChange={(e) =>
                  setExceptionForm((f) => ({ ...f, reason: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {exceptionError && (
              <p className="text-sm text-red-500 dark:text-red-400">{exceptionError}</p>
            )}
            {exceptionSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{exceptionSuccess}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={exceptionSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                {exceptionSaving && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {ta.addException}
              </button>
            </div>
          </form>

          {/* Exceptions list */}
          {exceptionsLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {ta.noExceptionsYet}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {ta.noExceptionsDescription}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-start">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      {ta.date}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      {ta.staffMemberLabel}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      {ta.closed}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      {ta.reason}
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((ex) => {
                    const staffName =
                      ex.serviceProviderId
                        ? (staffList.find((s) => s.id === ex.serviceProviderId)?.displayName ?? ex.serviceProviderId)
                        : ta.entireBusiness;
                    return (
                      <tr
                        key={ex.id}
                        className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(ex.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {staffName}
                        </td>
                        <td className="px-4 py-3">
                          {ex.isClosed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                              {ta.closed}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {ex.startTime} – {ex.endTime}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {ex.reason ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-end">
                          <button
                            onClick={() => void handleDeleteException(ex.id)}
                            disabled={deletingId === ex.id}
                            className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 transition-colors disabled:opacity-40"
                          >
                            {deletingId === ex.id ? (
                              <span className="inline-block w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              ta.deleteException
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

      </div>
    </>
  );
}

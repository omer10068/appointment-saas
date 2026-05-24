'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  AppointmentStatus,
  CreateAppointmentPayload,
  DashboardAppointmentDto,
  DashboardCustomerDto,
  DashboardServiceDto,
  DashboardServiceProviderDto,
  UpdateAppointmentPayload,
} from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import {
  createDashboardAppointment,
  fetchDashboardAppointments,
  fetchDashboardCustomers,
  fetchDashboardServices,
  fetchDashboardServiceProviders,
  updateDashboardAppointment,
  updateDashboardAppointmentStatus,
} from '../../../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: AppointmentStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
    case 'COMPLETED':
      return 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800';
    case 'CANCELLED_BY_CUSTOMER':
    case 'CANCELLED_BY_BUSINESS':
      return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800';
    case 'NO_SHOW':
      return 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  }
}

function statusLabel(
  status: AppointmentStatus,
  t: ReturnType<typeof useDashboardI18n>['appointmentsList'],
): string {
  switch (status) {
    case 'SCHEDULED': return t.statusScheduled;
    case 'CONFIRMED': return t.statusConfirmed;
    case 'CANCELLED_BY_CUSTOMER': return t.statusCancelledByCustomer;
    case 'CANCELLED_BY_BUSINESS': return t.statusCancelledByBusiness;
    case 'COMPLETED': return t.statusCompleted;
    case 'NO_SHOW': return t.statusNoShow;
  }
}

function isClosed(status: AppointmentStatus): boolean {
  return (
    status === 'CANCELLED_BY_CUSTOMER' ||
    status === 'CANCELLED_BY_BUSINESS' ||
    status === 'COMPLETED' ||
    status === 'NO_SHOW'
  );
}

function formatDateTime(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  businessCustomerId: string;
  serviceId: string;
  serviceProviderId: string;
  startsAt: string;
}

function emptyForm(): FormState {
  return { businessCustomerId: '', serviceId: '', serviceProviderId: '', startsAt: '' };
}

function apptToForm(a: DashboardAppointmentDto): FormState {
  return {
    businessCustomerId: a.businessCustomerId,
    serviceId: a.serviceId,
    serviceProviderId: a.serviceProviderId,
    startsAt: a.startsAt.slice(0, 16),
  };
}

// ─── Appointment row ──────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  locale,
  t,
  tf,
  onEdit,
  onStatusChange,
  isUpdating,
}: {
  appt: DashboardAppointmentDto;
  locale: string;
  t: ReturnType<typeof useDashboardI18n>['appointmentsList'];
  tf: ReturnType<typeof useDashboardI18n>['appointmentForm'];
  onEdit: (a: DashboardAppointmentDto) => void;
  onStatusChange: (a: DashboardAppointmentDto, status: AppointmentStatus) => void;
  isUpdating: boolean;
}) {
  const closed = isClosed(appt.status as AppointmentStatus);
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{appt.customerName}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">{appt.serviceName}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">{appt.serviceProviderName ?? '—'}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">{formatDateTime(appt.startsAt, locale)}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(appt.status as AppointmentStatus)}`}>
          {statusLabel(appt.status as AppointmentStatus, t)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!closed && (
            <button
              onClick={() => onEdit(appt)}
              disabled={isUpdating}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              {tf.editAppointment}
            </button>
          )}
          {appt.status === 'SCHEDULED' && (
            <button
              onClick={() => onStatusChange(appt, 'CONFIRMED')}
              disabled={isUpdating}
              className="text-xs text-green-600 dark:text-green-400 hover:underline disabled:opacity-50"
            >
              {tf.confirm}
            </button>
          )}
          {(appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED') && (
            <>
              <button
                onClick={() => onStatusChange(appt, 'COMPLETED')}
                disabled={isUpdating}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
              >
                {tf.complete}
              </button>
              <button
                onClick={() => onStatusChange(appt, 'CANCELLED_BY_BUSINESS')}
                disabled={isUpdating}
                className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                {tf.cancelAppointment}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function AppointmentModal({
  editing,
  form,
  setForm,
  customers,
  services,
  staff,
  t,
  onSave,
  onClose,
  saving,
}: {
  editing: DashboardAppointmentDto | null;
  form: FormState;
  setForm: (f: FormState) => void;
  customers: DashboardCustomerDto[];
  services: DashboardServiceDto[];
  staff: DashboardServiceProviderDto[];
  t: ReturnType<typeof useDashboardI18n>['appointmentForm'];
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const isEdit = editing !== null;
  const activeStaff = staff.filter((s) => s.isActive);
  const selectedStaff = activeStaff.find((s) => s.id === form.serviceProviderId);
  const availableServices = isEdit
    ? services.filter((s) => s.isActive)
    : selectedStaff
      ? services.filter((s) => s.isActive && selectedStaff.serviceIds.includes(s.id))
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {isEdit ? t.editAppointment : t.addAppointment}
        </h2>

        <div className="space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.customer}
              </label>
              <select
                required
                value={form.businessCustomerId}
                onChange={(e) => setForm({ ...form, businessCustomerId: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t.noCustomers}</option>
                {customers.map((c) => (
                  <option key={c.businessCustomerId} value={c.businessCustomerId}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.staff} *
            </label>
            {isEdit ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{editing.serviceProviderName}</p>
            ) : (
              <select
                required
                value={form.serviceProviderId}
                onChange={(e) =>
                  setForm({ ...form, serviceProviderId: e.target.value, serviceId: '' })
                }
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t.noStaff}</option>
                {activeStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.displayName}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.service} *
            </label>
            {isEdit ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{editing.serviceName}</p>
            ) : (
              <select
                required
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                disabled={!form.serviceProviderId}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="">{t.noServices}</option>
                {availableServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.startsAt}
            </label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white rounded-md hover:bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] disabled:opacity-50"
          >
            {saving ? '…' : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const { getToken } = useAuth();
  const { currentBusinessId: businessId } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.appointmentsList;
  const tf = dict.appointmentForm;
  const p = dict.pages.appointments;

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [appointments, setAppointments] = useState<DashboardAppointmentDto[]>([]);
  const [customers, setCustomers] = useState<DashboardCustomerDto[]>([]);
  const [services, setServices] = useState<DashboardServiceDto[]>([]);
  const [staff, setStaff] = useState<DashboardServiceProviderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardAppointmentDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    setAppointments([]);
    setCustomers([]);
    setServices([]);
    setStaff([]);
    setError(null);
    setLoading(true);

    const gt = () => getTokenRef.current();

    Promise.all([
      fetchDashboardAppointments(businessId, gt),
      fetchDashboardCustomers(businessId, gt),
      fetchDashboardServices(businessId, gt),
      fetchDashboardServiceProviders(businessId, gt),
    ])
      .then(([appts, custs, svcs, stf]) => {
        if (cancelled) return;
        setAppointments(appts);
        setCustomers(custs);
        setServices(svcs);
        setStaff(stf);
      })
      .catch(() => {
        if (!cancelled) setError(tf.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [businessId, tf.loadError]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(appt: DashboardAppointmentDto) {
    setEditing(appt);
    setForm(apptToForm(appt));
    setSaveError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSave() {
    if (!businessId) return;
    setSaving(true);
    setSaveError(null);
    const gt = () => getTokenRef.current();

    try {
      if (editing) {
        const payload: UpdateAppointmentPayload = {
          ...(form.serviceProviderId && form.serviceProviderId !== editing.serviceProviderId && {
            serviceProviderId: form.serviceProviderId,
          }),
          ...(form.startsAt && form.startsAt !== editing.startsAt.slice(0, 16) && {
            startsAt: new Date(form.startsAt).toISOString(),
          }),
        };
        const updated = await updateDashboardAppointment(businessId, editing.id, payload, gt);
        setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        if (!form.businessCustomerId || !form.serviceId || !form.serviceProviderId || !form.startsAt) {
          setSaveError(tf.saveError);
          return;
        }
        const payload: CreateAppointmentPayload = {
          businessCustomerId: form.businessCustomerId,
          serviceId: form.serviceId,
          serviceProviderId: form.serviceProviderId,
          startsAt: new Date(form.startsAt).toISOString(),
        };
        const created = await createDashboardAppointment(businessId, payload, gt);
        setAppointments((prev) => [created, ...prev]);
      }
      closeModal();
    } catch {
      setSaveError(tf.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(appt: DashboardAppointmentDto, status: AppointmentStatus) {
    if (!businessId) return;
    setUpdatingId(appt.id);
    const gt = () => getTokenRef.current();
    try {
      const updated = await updateDashboardAppointmentStatus(businessId, appt.id, { status }, gt);
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      // status update silently ignored
    } finally {
      setUpdatingId(null);
    }
  }

  if (!businessId) {
    return (
      <>
        <DashboardPageHeader title={p.title} description={p.description} />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{p.emptyTitle}</p>
      </>
    );
  }

  return (
    <>
      <DashboardPageHeader title={p.title} description={p.description} />

      <div className="mt-6">
        <div className="flex justify-end mb-4">
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white text-sm rounded-md hover:bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)]"
          >
            {t.addAppointment}
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">{error}</p>
        )}

        {!loading && !error && appointments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.noAppointmentsYet}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.noAppointmentsDescription}</p>
          </div>
        )}

        {!loading && appointments.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-start">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {[t.customer, t.service, t.staff, t.date, t.status, t.actions].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                {appointments.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    appt={appt}
                    locale={dict.lang}
                    t={t}
                    tf={tf}
                    onEdit={openEdit}
                    onStatusChange={handleStatusChange}
                    isUpdating={updatingId === appt.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {saveError && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{saveError}</p>
      )}

      {modalOpen && (
        <AppointmentModal
          editing={editing}
          form={form}
          setForm={setForm}
          customers={customers}
          services={services}
          staff={staff}
          t={tf}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </>
  );
}

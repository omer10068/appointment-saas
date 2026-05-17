'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  CreateCustomerPayload,
  CustomerStatus,
  DashboardCustomerDto,
  UpdateCustomerPayload,
} from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import {
  createDashboardCustomer,
  fetchDashboardCustomers,
  updateDashboardCustomer,
  updateDashboardCustomerStatus,
} from '../../../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: CustomerStatus): string {
  if (status === 'ACTIVE')
    return 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800';
  if (status === 'BLOCKED')
    return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800';
  return 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
}

function statusLabel(
  status: CustomerStatus,
  t: ReturnType<typeof useDashboardI18n>['customersList'],
): string {
  if (status === 'ACTIVE') return t.statusActive;
  if (status === 'BLOCKED') return t.statusBlocked;
  return t.statusArchived;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
}

function emptyForm(): FormState {
  return { fullName: '', email: '', phone: '', notes: '' };
}

function customerToForm(c: DashboardCustomerDto): FormState {
  return {
    fullName: c.fullName,
    email: c.email ?? '',
    phone: c.phone ?? '',
    notes: c.notes ?? '',
  };
}

// ─── Customer row ─────────────────────────────────────────────────────────────

function CustomerRow({
  customer,
  t,
  tf,
  onEdit,
  onStatusChange,
  isUpdating,
}: {
  customer: DashboardCustomerDto;
  t: ReturnType<typeof useDashboardI18n>['customersList'];
  tf: ReturnType<typeof useDashboardI18n>['customerForm'];
  onEdit: (c: DashboardCustomerDto) => void;
  onStatusChange: (c: DashboardCustomerDto, status: CustomerStatus) => void;
  isUpdating: boolean;
}) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {customer.fullName}
        </p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {customer.email ?? (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {customer.phone ?? (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(customer.status)}`}
        >
          {statusLabel(customer.status, t)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-40 truncate">
        {customer.notes ?? ''}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onEdit(customer)}
            disabled={isUpdating}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {tf.editCustomer}
          </button>
          {customer.status !== 'ACTIVE' && (
            <button
              onClick={() => onStatusChange(customer, 'ACTIVE')}
              disabled={isUpdating}
              className="text-xs px-2.5 py-1 rounded border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950 transition-colors disabled:opacity-40"
            >
              {tf.activateCustomer}
            </button>
          )}
          {customer.status === 'ACTIVE' && (
            <button
              onClick={() => onStatusChange(customer, 'BLOCKED')}
              disabled={isUpdating}
              className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 transition-colors disabled:opacity-40"
            >
              {tf.blockCustomer}
            </button>
          )}
          {customer.status !== 'ARCHIVED' && (
            <button
              onClick={() => onStatusChange(customer, 'ARCHIVED')}
              disabled={isUpdating}
              className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {tf.archiveCustomer}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function CustomerModal({
  editingCustomer,
  tf,
  dir,
  onClose,
  onSave,
  isSaving,
  saveError,
}: {
  editingCustomer: DashboardCustomerDto | null;
  tf: ReturnType<typeof useDashboardI18n>['customerForm'];
  dir: 'rtl' | 'ltr';
  onClose: () => void;
  onSave: (form: FormState) => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<FormState>(() =>
    editingCustomer ? customerToForm(editingCustomer) : emptyForm(),
  );

  const set = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        dir={dir}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {editingCustomer ? tf.editCustomer : tf.addCustomer}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="px-6 py-5 space-y-4"
        >
          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tf.customerName} *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tf.email}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tf.phone}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tf.notes}
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {saveError && (
            <p className="text-sm text-red-500 dark:text-red-400">{saveError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {tf.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {isSaving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {tf.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { currentBusiness } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.customersList;
  const tf = dict.customerForm;
  const p = dict.pages.customers;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [customers, setCustomers] = useState<DashboardCustomerDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<DashboardCustomerDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const businessId = currentBusiness?.business.id;

  // ─── Load customers ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!businessId) {
      setCustomers([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setCustomers([]);

    fetchDashboardCustomers(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) setCustomers(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(tf.loadError);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId, tf.loadError]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingCustomer(null);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(customer: DashboardCustomerDto) {
    setEditingCustomer(customer);
    setSaveError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  // ─── Save (create or update) ────────────────────────────────────────────────

  async function handleSave(form: FormState) {
    if (!businessId) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      if (editingCustomer) {
        const payload: UpdateCustomerPayload = {
          fullName: form.fullName,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        };
        const updated = await updateDashboardCustomer(
          businessId,
          editingCustomer.businessCustomerId,
          payload,
          () => getTokenRef.current(),
        );
        setCustomers((prev) =>
          prev.map((c) =>
            c.businessCustomerId === updated.businessCustomerId ? updated : c,
          ),
        );
        showSuccess(tf.updatedSuccess);
      } else {
        const payload: CreateCustomerPayload = {
          fullName: form.fullName,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        };
        const created = await createDashboardCustomer(
          businessId,
          payload,
          () => getTokenRef.current(),
        );
        setCustomers((prev) => [created, ...prev]);
        showSuccess(tf.createdSuccess);
      }
      setModalOpen(false);
    } catch {
      setSaveError(tf.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Status change ──────────────────────────────────────────────────────────

  async function handleStatusChange(
    customer: DashboardCustomerDto,
    status: CustomerStatus,
  ) {
    if (!businessId) return;
    setUpdatingId(customer.businessCustomerId);
    try {
      const updated = await updateDashboardCustomerStatus(
        businessId,
        customer.businessCustomerId,
        { status },
        () => getTokenRef.current(),
      );
      setCustomers((prev) =>
        prev.map((c) =>
          c.businessCustomerId === updated.businessCustomerId ? updated : c,
        ),
      );
      showSuccess(tf.updatedSuccess);
    } catch {
      // status change failure is silent — user can retry
    } finally {
      setUpdatingId(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {modalOpen && (
        <CustomerModal
          editingCustomer={editingCustomer}
          tf={tf}
          dir={dict.dir}
          onClose={closeModal}
          onSave={(form) => void handleSave(form)}
          isSaving={isSaving}
          saveError={saveError}
        />
      )}

      <DashboardPageHeader title={p.title} description={p.description} />

      {successMessage && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {!currentBusiness ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {dict.overview.noBusinessAssigned}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-500 dark:text-red-400">{loadError}</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex justify-end mb-4">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              {t.addCustomer}
            </button>
          </div>

          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.noCustomersYet}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t.noCustomersDescription}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.customerName}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.email}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.phone}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.status}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.notes}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <CustomerRow
                        key={customer.businessCustomerId}
                        customer={customer}
                        t={t}
                        tf={tf}
                        onEdit={openEdit}
                        onStatusChange={(c, status) =>
                          void handleStatusChange(c, status)
                        }
                        isUpdating={
                          updatingId === customer.businessCustomerId
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

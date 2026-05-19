'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  CreateServiceProviderPayload,
  DashboardBusinessUserDto,
  DashboardServiceDto,
  DashboardServiceProviderDto,
  UpdateServiceProviderPayload,
} from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import {
  createDashboardServiceProvider,
  fetchDashboardBusinessUsers,
  fetchDashboardServices,
  fetchDashboardServiceProviders,
  updateDashboardServiceProvider,
  updateDashboardServiceProviderStatus,
} from '../../../lib/api';

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  displayName: string;
  businessUserId: string;
  serviceIds: string[];
  isActive: boolean;
}

function emptyForm(): FormState {
  return { displayName: '', businessUserId: '', serviceIds: [], isActive: true };
}

function providerToForm(sp: DashboardServiceProviderDto): FormState {
  return {
    displayName: sp.displayName,
    businessUserId: sp.businessUserId,
    serviceIds: sp.serviceIds,
    isActive: sp.isActive,
  };
}

// ─── Service provider row ─────────────────────────────────────────────────────

function ServiceProviderRow({
  sp,
  t,
  tf,
  onEdit,
  onToggleStatus,
  isUpdating,
}: {
  sp: DashboardServiceProviderDto;
  t: ReturnType<typeof useDashboardI18n>['staffList'];
  tf: ReturnType<typeof useDashboardI18n>['staffForm'];
  onEdit: (sp: DashboardServiceProviderDto) => void;
  onToggleStatus: (sp: DashboardServiceProviderDto) => void;
  isUpdating: boolean;
}) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {sp.displayName}
        </p>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            sp.isActive
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
              : 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
          }`}
        >
          {sp.isActive ? t.active : t.inactive}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(sp)}
            disabled={isUpdating}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {tf.editStaffMember}
          </button>
          <button
            onClick={() => onToggleStatus(sp)}
            disabled={isUpdating}
            className={`text-xs px-2.5 py-1 rounded border transition-colors disabled:opacity-40 ${
              sp.isActive
                ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950'
                : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950'
            }`}
          >
            {sp.isActive ? tf.deactivate : tf.activate}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ServiceProviderModal({
  editingProvider,
  businessUsers,
  services,
  tf,
  dir,
  onClose,
  onSave,
  isSaving,
  saveError,
}: {
  editingProvider: DashboardServiceProviderDto | null;
  businessUsers: DashboardBusinessUserDto[];
  services: DashboardServiceDto[];
  tf: ReturnType<typeof useDashboardI18n>['staffForm'];
  dir: 'rtl' | 'ltr';
  onClose: () => void;
  onSave: (form: FormState) => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<FormState>(() =>
    editingProvider ? providerToForm(editingProvider) : emptyForm(),
  );

  const set = (field: keyof FormState, value: string | boolean | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function toggleService(serviceId: string) {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  }

  const activeServices = services.filter((s) => s.isActive);
  const availableUsers = editingProvider
    ? businessUsers
    : businessUsers.filter((u) => !u.hasServiceProviderProfile);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        dir={dir}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {editingProvider ? tf.editStaffMember : tf.addStaffMember}
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
          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tf.staffName} *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Linked business user */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tf.businessUser} *
            </label>
            {editingProvider ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-1">
                {businessUsers.find((u) => u.id === form.businessUserId)?.id ?? form.businessUserId}
              </p>
            ) : (
              <select
                required
                value={form.businessUserId}
                onChange={(e) => set('businessUserId', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{tf.selectBusinessUser}</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tf.services} *
            </label>
            {activeServices.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {tf.noServicesAvailable}
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeServices.map((svc) => (
                  <label
                    key={svc.id}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {svc.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* isActive */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {tf.isActive}
            </span>
          </label>

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

export default function ServiceProvidersPage() {
  const { currentBusiness } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.staffList;
  const tf = dict.staffForm;
  const p = dict.pages.staff;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [serviceProviders, setServiceProviders] = useState<DashboardServiceProviderDto[]>([]);
  const [businessUsers, setBusinessUsers] = useState<DashboardBusinessUserDto[]>([]);
  const [services, setServices] = useState<DashboardServiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] =
    useState<DashboardServiceProviderDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const businessId = currentBusiness?.business.id;

  // ─── Load service providers, business users, services ────────────────────────

  useEffect(() => {
    if (!businessId) {
      setServiceProviders([]);
      setBusinessUsers([]);
      setServices([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setServiceProviders([]);

    const gt = () => getTokenRef.current();

    Promise.all([
      fetchDashboardServiceProviders(businessId, gt),
      fetchDashboardBusinessUsers(businessId, gt),
      fetchDashboardServices(businessId, gt),
    ])
      .then(([providers, users, svcs]) => {
        if (cancelled) return;
        setServiceProviders(providers);
        setBusinessUsers(users);
        setServices(svcs);
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

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingProvider(null);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(sp: DashboardServiceProviderDto) {
    setEditingProvider(sp);
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

  // ─── Save (create or update) ──────────────────────────────────────────────────

  async function handleSave(form: FormState) {
    if (!businessId) return;
    if (form.serviceIds.length === 0) {
      setSaveError(tf.saveError);
      return;
    }
    setIsSaving(true);
    setSaveError(null);

    try {
      if (editingProvider) {
        const payload: UpdateServiceProviderPayload = {
          displayName: form.displayName,
          serviceIds: form.serviceIds,
          isActive: form.isActive,
        };
        const updated = await updateDashboardServiceProvider(
          businessId,
          editingProvider.id,
          payload,
          () => getTokenRef.current(),
        );
        setServiceProviders((prev) =>
          prev.map((sp) => (sp.id === updated.id ? updated : sp)),
        );
        showSuccess(tf.updatedSuccess);
      } else {
        const payload: CreateServiceProviderPayload = {
          displayName: form.displayName,
          businessUserId: form.businessUserId,
          serviceIds: form.serviceIds,
          isActive: form.isActive,
        };
        const created = await createDashboardServiceProvider(
          businessId,
          payload,
          () => getTokenRef.current(),
        );
        setServiceProviders((prev) => [...prev, created]);
        showSuccess(tf.createdSuccess);
      }
      setModalOpen(false);
    } catch {
      setSaveError(tf.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Toggle status ────────────────────────────────────────────────────────────

  async function handleToggleStatus(sp: DashboardServiceProviderDto) {
    if (!businessId) return;
    setUpdatingId(sp.id);
    try {
      const updated = await updateDashboardServiceProviderStatus(
        businessId,
        sp.id,
        { isActive: !sp.isActive },
        () => getTokenRef.current(),
      );
      setServiceProviders((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      showSuccess(tf.updatedSuccess);
    } catch {
      // silent retry
    } finally {
      setUpdatingId(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {modalOpen && (
        <ServiceProviderModal
          editingProvider={editingProvider}
          businessUsers={businessUsers}
          services={services}
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
              {t.addStaffMember}
            </button>
          </div>

          {serviceProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.noStaffYet}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t.noStaffDescription}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.staffName}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.active}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceProviders.map((sp) => (
                      <ServiceProviderRow
                        key={sp.id}
                        sp={sp}
                        t={t}
                        tf={tf}
                        onEdit={openEdit}
                        onToggleStatus={(s) => void handleToggleStatus(s)}
                        isUpdating={updatingId === sp.id}
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

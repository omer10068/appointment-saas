'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  CreateServicePayload,
  DashboardServiceDto,
  UpdateServicePayload,
} from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import {
  createDashboardService,
  fetchDashboardServices,
  updateDashboardService,
  updateDashboardServiceStatus,
} from '../../../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(priceCents: number | null, freeLabel: string): string {
  if (priceCents === null) return '—';
  if (priceCents === 0) return freeLabel;
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

function ilsToCents(ils: string): number | null {
  const trimmed = ils.trim();
  if (trimmed === '') return null;
  const parsed = parseFloat(trimmed);
  if (isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function centsToIls(cents: number | null): string {
  if (cents === null) return '';
  return String(cents / 100);
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  durationMinutes: string;
  priceIls: string;
  bufferBeforeMin: string;
  bufferAfterMin: string;
  isActive: boolean;
}

function emptyForm(): FormState {
  return {
    name: '',
    description: '',
    durationMinutes: '30',
    priceIls: '',
    bufferBeforeMin: '0',
    bufferAfterMin: '0',
    isActive: true,
  };
}

function serviceToForm(svc: DashboardServiceDto): FormState {
  return {
    name: svc.name,
    description: svc.description ?? '',
    durationMinutes: String(svc.durationMinutes),
    priceIls: centsToIls(svc.priceCents),
    bufferBeforeMin: String(svc.bufferBeforeMin),
    bufferAfterMin: String(svc.bufferAfterMin),
    isActive: svc.isActive,
  };
}

// ─── Service row ──────────────────────────────────────────────────────────────

function ServiceRow({
  svc,
  t,
  tf,
  onEdit,
  onToggleStatus,
  isUpdating,
}: {
  svc: DashboardServiceDto;
  t: ReturnType<typeof useDashboardI18n>['servicesList'];
  tf: ReturnType<typeof useDashboardI18n>['serviceForm'];
  onEdit: (svc: DashboardServiceDto) => void;
  onToggleStatus: (svc: DashboardServiceDto) => void;
  isUpdating: boolean;
}) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {svc.name}
        </p>
        {svc.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {svc.description}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {svc.durationMinutes} {t.minutes}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {formatPrice(svc.priceCents, t.free)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            svc.isActive
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
              : 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
          }`}
        >
          {svc.isActive ? t.active : t.inactive}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(svc)}
            disabled={isUpdating}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {tf.editService}
          </button>
          <button
            onClick={() => onToggleStatus(svc)}
            disabled={isUpdating}
            className={`text-xs px-2.5 py-1 rounded border transition-colors disabled:opacity-40 ${
              svc.isActive
                ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950'
                : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950'
            }`}
          >
            {svc.isActive ? tf.deactivate : tf.activate}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ServiceModal({
  editingService,
  tf,
  dir,
  onClose,
  onSave,
  isSaving,
  saveError,
}: {
  editingService: DashboardServiceDto | null;
  tf: ReturnType<typeof useDashboardI18n>['serviceForm'];
  dir: 'rtl' | 'ltr';
  onClose: () => void;
  onSave: (form: FormState) => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<FormState>(() =>
    editingService ? serviceToForm(editingService) : emptyForm(),
  );

  const set = (field: keyof FormState, value: string | boolean) =>
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
            {editingService ? tf.editService : tf.addService}
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tf.serviceName} *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tf.description}
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Duration + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tf.durationMinutes} *
              </label>
              <input
                type="number"
                required
                min={5}
                max={480}
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tf.priceIls}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.priceIls}
                onChange={(e) => set('priceIls', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Buffer before + after */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tf.bufferBefore}
              </label>
              <input
                type="number"
                min={0}
                value={form.bufferBeforeMin}
                onChange={(e) => set('bufferBeforeMin', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tf.bufferAfter}
              </label>
              <input
                type="number"
                min={0}
                value={form.bufferAfterMin}
                onChange={(e) => set('bufferAfterMin', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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

export default function ServicesPage() {
  const { currentBusiness } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.servicesList;
  const tf = dict.serviceForm;
  const p = dict.pages.services;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [services, setServices] = useState<DashboardServiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<DashboardServiceDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const businessId = currentBusiness?.business.id;

  // ─── Load services ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!businessId) {
      setServices([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setServices([]);

    fetchDashboardServices(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) setServices(data);
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
    setEditingService(null);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(svc: DashboardServiceDto) {
    setEditingService(svc);
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

    const duration = parseInt(form.durationMinutes, 10);
    const bufferBefore = parseInt(form.bufferBeforeMin, 10);
    const bufferAfter = parseInt(form.bufferAfterMin, 10);
    const priceCents = ilsToCents(form.priceIls);

    try {
      if (editingService) {
        const payload: UpdateServicePayload = {
          name: form.name,
          description: form.description.trim() || null,
          durationMinutes: duration,
          priceCents,
          bufferBeforeMin: bufferBefore,
          bufferAfterMin: bufferAfter,
          isActive: form.isActive,
        };
        const updated = await updateDashboardService(
          businessId,
          editingService.id,
          payload,
          () => getTokenRef.current(),
        );
        setServices((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        showSuccess(tf.updatedSuccess);
      } else {
        const payload: CreateServicePayload = {
          name: form.name,
          description: form.description.trim() || null,
          durationMinutes: duration,
          priceCents,
          bufferBeforeMin: bufferBefore,
          bufferAfterMin: bufferAfter,
          isActive: form.isActive,
        };
        const created = await createDashboardService(
          businessId,
          payload,
          () => getTokenRef.current(),
        );
        setServices((prev) => [...prev, created]);
        showSuccess(tf.createdSuccess);
      }
      setModalOpen(false);
    } catch {
      setSaveError(tf.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Toggle status ──────────────────────────────────────────────────────────

  async function handleToggleStatus(svc: DashboardServiceDto) {
    if (!businessId) return;
    setUpdatingId(svc.id);
    try {
      const updated = await updateDashboardServiceStatus(
        businessId,
        svc.id,
        !svc.isActive,
        () => getTokenRef.current(),
      );
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showSuccess(tf.updatedSuccess);
    } catch {
      // status toggle failure is silent — user can retry
    } finally {
      setUpdatingId(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {modalOpen && (
        <ServiceModal
          editingService={editingService}
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
              {t.addService}
            </button>
          </div>

          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.noServicesYet}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t.noServicesDescription}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.serviceName}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.duration}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t.price}
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
                    {services.map((svc) => (
                      <ServiceRow
                        key={svc.id}
                        svc={svc}
                        t={t}
                        tf={tf}
                        onEdit={openEdit}
                        onToggleStatus={(s) => void handleToggleStatus(s)}
                        isUpdating={updatingId === svc.id}
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

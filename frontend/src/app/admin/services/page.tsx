'use client';

import { useEffect, useState } from 'react';
import {
  getServices,
  createService,
  updateService,
  deactivateService,
} from '@/lib/api';
import type { Service } from '@/lib/types';

type FormState = {
  name: string;
  duration_minutes: string;
  price_cents: string;
  description: string;
};

const emptyForm: FormState = { name: '', duration_minutes: '', price_cents: '', description: '' };

function toForm(s: Service): FormState {
  return {
    name: s.name,
    duration_minutes: String(s.duration_minutes),
    price_cents: String(s.price_cents / 100),
    description: s.description ?? '',
  };
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setServices(await getServices(!showAll));
    } catch {
      setError('Laden fehlgeschlagen.');
    }
  };

  useEffect(() => { load(); }, [showAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCreate = () => { setCreating(true); setEditing(null); setForm(emptyForm); setError(null); };
  const startEdit = (s: Service) => { setEditing(s); setCreating(false); setForm(toForm(s)); setError(null); };
  const cancelForm = () => { setCreating(false); setEditing(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      duration_minutes: Number(form.duration_minutes),
      price_cents: Math.round(Number(form.price_cents) * 100),
      description: form.description || undefined,
      is_active: true,
    };
    try {
      if (editing) {
        await updateService(editing.id, payload);
      } else {
        await createService(payload);
      }
      cancelForm();
      await load();
    } catch {
      setError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (s: Service) => {
    if (!confirm(`„${s.name}" deaktivieren?`)) return;
    try {
      await deactivateService(s.id);
      await load();
    } catch {
      setError('Deaktivieren fehlgeschlagen.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dienstleistungen</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded"
            />
            Inaktive anzeigen
          </label>
          <button
            onClick={startCreate}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Neu
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(creating || editing) && (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <h2 className="font-semibold text-gray-800">
            {editing ? 'Dienstleistung bearbeiten' : 'Neue Dienstleistung'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Dauer (Min.) *</label>
              <input
                required
                type="number"
                min={5}
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Preis (€) *</label>
              <input
                required
                type="number"
                min={0}
                step={0.01}
                value={form.price_cents}
                onChange={(e) => setForm((f) => ({ ...f, price_cents: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Beschreibung</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Dauer', 'Preis', 'Beschreibung', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {services.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">
                  Keine Dienstleistungen vorhanden.
                </td>
              </tr>
            )}
            {services.map((s) => (
              <tr key={s.id} className={s.is_active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.duration_minutes} min</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {(s.price_cents / 100).toFixed(2)} €
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Bearbeiten
                    </button>
                    {s.is_active && (
                      <button
                        onClick={() => handleDeactivate(s)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Deaktivieren
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

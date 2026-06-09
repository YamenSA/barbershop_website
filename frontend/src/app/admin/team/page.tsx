'use client';

import { useEffect, useState } from 'react';
import {
  getServices,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  assignServices,
} from '@/lib/api';
import type { Service, TeamMember } from '@/lib/types';

type FormState = { name: string; bio: string; photo_url: string };
const emptyForm: FormState = { name: '', bio: '', photo_url: '' };

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [m, s] = await Promise.all([getTeamMembers(!showAll), getServices(true)]);
      setMembers(m);
      setAllServices(s);
    } catch {
      setError('Laden fehlgeschlagen.');
    }
  };

  useEffect(() => { load(); }, [showAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm);
    setSelectedServiceIds([]);
    setError(null);
  };

  const startEdit = (m: TeamMember) => {
    setEditing(m);
    setCreating(false);
    setForm({ name: m.name, bio: m.bio ?? '', photo_url: m.photo_url ?? '' });
    setSelectedServiceIds((m.services ?? []).map((s) => s.id));
    setError(null);
  };

  const cancelForm = () => { setCreating(false); setEditing(null); };

  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      bio: form.bio || undefined,
      photo_url: form.photo_url || undefined,
      is_active: true,
    };
    try {
      let saved: TeamMember;
      if (editing) {
        saved = await updateTeamMember(editing.id, payload);
      } else {
        saved = await createTeamMember(payload);
      }
      await assignServices(saved.id, selectedServiceIds);
      cancelForm();
      await load();
    } catch {
      setError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (m: TeamMember) => {
    if (!confirm(`„${m.name}" deaktivieren?`)) return;
    try {
      await updateTeamMember(m.id, { is_active: false });
      await load();
    } catch {
      setError('Deaktivieren fehlgeschlagen.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
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
        <form onSubmit={handleSubmit} className="rounded-lg border bg-gray-50 p-4 space-y-4">
          <h2 className="font-semibold text-gray-800">
            {editing ? 'Teammitglied bearbeiten' : 'Neues Teammitglied'}
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
              <label className="block text-xs font-medium text-gray-600">Foto-URL</label>
              <input
                type="url"
                value={form.photo_url}
                onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600">Bio</label>
              <textarea
                rows={2}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {allServices.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Dienstleistungen</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {allServices.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      className="rounded"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
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
              {['Name', 'Bio', 'Dienstleistungen', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                  Keine Teammitglieder vorhanden.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id} className={m.is_active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                  {m.bio ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {(m.services ?? []).length > 0
                    ? (m.services ?? []).map((s) => s.name).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {m.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(m)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Bearbeiten
                    </button>
                    {m.is_active && (
                      <button
                        onClick={() => handleDeactivate(m)}
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

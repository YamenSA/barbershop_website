'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  apiFetch,
  getServices,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  assignServices,
} from '@/lib/api';
import type { Service, TeamMember, TargetGroup, WorkingHours } from '@/lib/types';

type FormState = { name: string; bio: string; photo_url: string; active: boolean };
const emptyForm: FormState = { name: '', bio: '', photo_url: '', active: true };

const GROUP_ORDER: TargetGroup[] = ['HERREN', 'DAMEN', 'KINDER'];
const GROUP_LABELS: Record<TargetGroup, string> = {
  HERREN: 'Herren',
  DAMEN: 'Damen',
  KINDER: 'Kinder',
};

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
  // Ids of active members that have services but NO working hours → they look
  // bookable but silently produce zero slots.
  const [missingHours, setMissingHours] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const [m, s] = await Promise.all([getTeamMembers(!showAll), getServices(true)]);
      setMembers(m);
      setAllServices(s);

      const candidates = m.filter((mem) => mem.is_active && (mem.services?.length ?? 0) > 0);
      const flags = await Promise.all(
        candidates.map((mem) =>
          apiFetch<WorkingHours[]>(`/team-members/${mem.id}/working-hours`)
            .then((wh) => [mem.id, wh.length === 0] as const)
            .catch(() => [mem.id, false] as const),
        ),
      );
      setMissingHours(new Set(flags.filter(([, missing]) => missing).map(([id]) => id)));
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
    setForm({ name: m.name, bio: m.bio ?? '', photo_url: m.photo_url ?? '', active: m.is_active });
    setSelectedServiceIds((m.services ?? []).map((s) => s.id));
    setError(null);
  };

  const cancelForm = () => { setCreating(false); setEditing(null); };

  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Bulk assignment per target group ("Paket"): assign/remove all services of
  // a group (e.g. all Herren) in one click, on top of individual selection.
  const groupServiceIds = (group: TargetGroup) =>
    allServices.filter((s) => s.target_group === group).map((s) => s.id);

  const toggleGroup = (group: TargetGroup, select: boolean) => {
    const ids = groupServiceIds(group);
    setSelectedServiceIds((prev) =>
      select
        ? Array.from(new Set([...prev, ...ids]))
        : prev.filter((id) => !ids.includes(id)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      bio: form.bio || undefined,
      photo_url: form.photo_url || undefined,
      is_active: form.active,
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
            className="rounded bg-[var(--admin-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--admin-primary-hover)]"
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
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="rounded"
                />
                Aktiv (für Buchungen sichtbar)
              </label>
            </div>
          </div>

          {allServices.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-600">Dienstleistungen</p>
              {GROUP_ORDER.filter((group) => groupServiceIds(group).length > 0).map((group) => {
                const ids = groupServiceIds(group);
                const selectedCount = ids.filter((id) => selectedServiceIds.includes(id)).length;
                const allSelected = selectedCount === ids.length;
                return (
                  <div key={group} className="rounded border border-gray-200 bg-white">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = !allSelected && selectedCount > 0;
                          }}
                          onChange={(e) => toggleGroup(group, e.target.checked)}
                          className="rounded"
                        />
                        Alle {GROUP_LABELS[group]}
                      </label>
                      <span className="text-xs text-gray-500">
                        {selectedCount}/{ids.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-3">
                      {allServices
                        .filter((s) => s.target_group === group)
                        .map((s) => (
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
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-[var(--admin-primary)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--admin-primary-hover)] disabled:opacity-50"
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

      <div className="overflow-x-auto rounded-lg border">
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
                  <div className="flex flex-col items-start gap-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {m.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    {missingHours.has(m.id) && (
                      <Link
                        href="/admin/schedule"
                        title="Ohne Arbeitszeiten erscheint dieses Mitglied bei der Buchung nicht"
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
                      >
                        ⚠ Keine Arbeitszeiten – nicht buchbar
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(m)}
                      className="text-sm text-[var(--admin-primary)] hover:text-[var(--admin-primary-hover)]"
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

'use client';

import { useEffect, useState } from 'react';
import { getTeamMembers } from '@/lib/api';
import type { TeamMember } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Props {
  defaultDate?: string;
}

export default function DailyPlanExport({ defaultDate }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [memberId, setMemberId] = useState('');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getTeamMembers(true).then(setMembers);
  }, []);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ date });
      if (memberId) qs.set('team_member_id', memberId);
      if (includeNotes) qs.set('include_notes', 'true');

      const resp = await fetch(`${API_BASE_URL}/admin/daily-plan/pdf?${qs}`, {
        credentials: 'include',
      });

      if (!resp.ok) throw new Error(`Fehler: ${resp.status}`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tagesplan-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        PDF exportieren
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Mitarbeiter (optional)</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Alle</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="rounded border-gray-300"
            />
            Notizen einschließen
          </label>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Exportiere…' : 'PDF herunterladen'}
          </button>
        </div>
      )}
    </div>
  );
}

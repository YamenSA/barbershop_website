'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { TeamMember, DayOverride, WorkingDayScheduleRead, WorkingWeekScheduleIn, WorkingDayScheduleIn } from '@/lib/types';

const DAYS = [
  { id: 1, name: 'Montag' },
  { id: 2, name: 'Dienstag' },
  { id: 3, name: 'Mittwoch' },
  { id: 4, name: 'Donnerstag' },
  { id: 5, name: 'Freitag' },
  { id: 6, name: 'Samstag' },
  { id: 0, name: 'Sonntag' },
];

export default function SchedulePage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [overrides, setOverrides] = useState<DayOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // New Override Form State
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideType, setOverrideType] = useState<'day_off' | 'extra_hours'>('day_off');
  const [customStart, setCustomStart] = useState('09:00');
  const [customEnd, setCustomEnd] = useState('17:00');
  const [overrideReason, setOverrideReason] = useState('');

  // Weekly Schedule State
  const [originalSchedule, setOriginalSchedule] = useState<WorkingDayScheduleIn[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<WorkingDayScheduleIn[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = JSON.stringify(originalSchedule) !== JSON.stringify(currentSchedule);

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      loadMemberData(selectedMember.id);
    }
  }, [selectedMember]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleLinkClick = (e: MouseEvent) => {
      if (!isDirty) return;
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href && target.href !== window.location.href) {
        if (!window.confirm('Es gibt ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?')) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleLinkClick, { capture: true });
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [isDirty]);

  const loadTeam = async () => {
    try {
      const data = await apiFetch<TeamMember[]>('/team-members');
      setTeam(data);
      if (data.length > 0) setSelectedMember(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberData = async (memberId: string) => {
    try {
      const [schedules, ovr] = await Promise.all([
        apiFetch<WorkingDayScheduleRead[]>(`/team-members/${memberId}/working-schedules`),
        apiFetch<DayOverride[]>(`/team-members/${memberId}/day-overrides`),
      ]);
      
      const scheduleMap = new Map(schedules.map(s => [s.day_of_week, s]));
      const initialSchedules: WorkingDayScheduleIn[] = [];
      
      // Build exactly 7 days, 0 (Monday) to 6 (Sunday) matching backend expectation
      for (let i = 0; i < 7; i++) {
        const s = scheduleMap.get(i);
        if (s && s.is_working && s.intervals.length > 0) {
          initialSchedules.push({
            is_working: true,
            intervals: [{
              start_time: s.intervals[0].start_time.substring(0, 5),
              end_time: s.intervals[0].end_time.substring(0, 5),
            }]
          });
        } else {
          initialSchedules.push({
            is_working: false,
            intervals: [{ start_time: '09:00', end_time: '17:00' }]
          });
        }
      }
      
      setOriginalSchedule(initialSchedules);
      setCurrentSchedule(JSON.parse(JSON.stringify(initialSchedules)));
      setSaveError(null);
      setSaveSuccess(false);

      setOverrides(ovr);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDayChange = (dayIndex: number, field: 'is_working' | 'start_time' | 'end_time', value: any) => {
    setCurrentSchedule(prev => {
      const newSchedule = [...prev];
      const updatedDay = { ...newSchedule[dayIndex] };
      const updatedIntervals = [ { ...updatedDay.intervals[0] } ];
      updatedDay.intervals = updatedIntervals;

      if (field === 'is_working') {
        updatedDay.is_working = value;
      } else {
        updatedDay.intervals[0][field] = value;
      }
      newSchedule[dayIndex] = updatedDay;
      return newSchedule;
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveSchedule = async () => {
    if (!selectedMember) return;
    
    // Client-side validation
    for (let i = 0; i < 7; i++) {
      const s = currentSchedule[i];
      if (s.is_working) {
        const interval = s.intervals[0];
        if (interval.start_time >= interval.end_time) {
          const dayName = DAYS.find(d => (d.id === 0 ? 6 : d.id - 1) === i)?.name || `Tag ${i + 1}`;
          setSaveError(`Fehler am ${dayName}: Die Startzeit muss vor der Endzeit liegen.`);
          return;
        }
      }
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: WorkingWeekScheduleIn = {
        days: currentSchedule.map(s => ({
          is_working: s.is_working,
          intervals: s.is_working ? [{
            start_time: s.intervals[0].start_time + ':00',
            end_time: s.intervals[0].end_time + ':00',
          }] : []
        }))
      };

      await apiFetch(`/team-members/${selectedMember.id}/working-schedules`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setOriginalSchedule(JSON.parse(JSON.stringify(currentSchedule)));
      setSaveSuccess(true);
    } catch (e: any) {
      setSaveError(e.message || 'Beim Speichern ist ein Fehler aufgetreten.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setCurrentSchedule(JSON.parse(JSON.stringify(originalSchedule)));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !overrideDate) return;

    const body: any = {
      date: overrideDate,
      override_type: overrideType,
      reason: overrideReason || null,
    };

    if (overrideType === 'extra_hours') {
      body.custom_start_time = customStart;
      body.custom_end_time = customEnd;
    }

    try {
      await apiFetch(`/team-members/${selectedMember.id}/day-overrides`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setOverrideDate('');
      setOverrideReason('');
      loadMemberData(selectedMember.id);
    } catch (e: any) {
      alert(e.message || 'Fehler beim Speichern der Ausnahme');
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await apiFetch(`/day-overrides/${id}`, { method: 'DELETE' });
      if (selectedMember) loadMemberData(selectedMember.id);
    } catch (e: any) {
      alert(e.message || 'Fehler beim Löschen');
    }
  };

  if (loading) return <div className="p-8">Laden...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Arbeitsplan & Überschreibungen</h1>
        <p className="text-gray-600">Verwalten Sie die regulären Arbeitszeiten und tagesgenaue Ausnahmen.</p>
      </div>

      <div className="flex gap-4 items-center">
        <label className="font-medium text-gray-800">Mitarbeiter wählen:</label>
        <select
          className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:ring-[#15803D] focus:border-[#15803D]"
          value={selectedMember?.id || ''}
          onChange={(e) => {
            if (isDirty) {
              if (!window.confirm('Es gibt ungespeicherte Änderungen. Möchten Sie wirklich wechseln?')) {
                return;
              }
            }
            setSelectedMember(team.find(m => m.id === e.target.value) || null);
          }}
        >
          {team.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {selectedMember && currentSchedule.length === 7 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Weekly Schedule */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Wochenplan ({selectedMember.name})</h2>
            
            <div className="space-y-4 mb-6">
              {DAYS.map(day => {
                // To map day.id (1=Mon..0=Sun) to index 0..6 where 0=Mon
                const dayIndex = day.id === 0 ? 6 : day.id - 1;
                const schedule = currentSchedule[dayIndex];
                
                return (
                  <div key={day.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3 w-40">
                      <input
                        type="checkbox"
                        checked={schedule.is_working}
                        onChange={(e) => handleDayChange(dayIndex, 'is_working', e.target.checked)}
                        className="w-4 h-4 text-[#15803D] border-gray-300 rounded focus:ring-[#15803D]"
                      />
                      <span className={`font-medium ${!schedule.is_working ? 'text-gray-400' : 'text-gray-900'}`}>
                        {day.name}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        className={`border rounded px-2 py-1 focus:ring-[#15803D] focus:border-[#15803D] ${!schedule.is_working ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                        value={schedule.intervals[0].start_time}
                        onChange={(e) => handleDayChange(dayIndex, 'start_time', e.target.value)}
                        disabled={!schedule.is_working}
                      />
                      <span className={!schedule.is_working ? 'text-gray-400' : 'text-gray-600'}>bis</span>
                      <input
                        type="time"
                        className={`border rounded px-2 py-1 focus:ring-[#15803D] focus:border-[#15803D] ${!schedule.is_working ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                        value={schedule.intervals[0].end_time}
                        onChange={(e) => handleDayChange(dayIndex, 'end_time', e.target.value)}
                        disabled={!schedule.is_working}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Bar */}
            {isDirty && (
              <div className="bg-gray-50 border-t border-gray-200 p-4 -mx-6 -mb-6 rounded-b-lg flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-700">Ungespeicherte Änderungen</span>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDiscardChanges}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                      Verwerfen
                    </button>
                    <button
                      onClick={handleSaveSchedule}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#15803D] rounded hover:bg-[#166534] disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Speichert...' : 'Änderungen speichern'}
                    </button>
                  </div>
                </div>
                {saveError && (
                  <div className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200">
                    {saveError}
                  </div>
                )}
              </div>
            )}
            
            {!isDirty && saveSuccess && (
              <div className="mt-4 text-sm text-[#15803D] bg-green-50 p-3 rounded border border-green-200">
                Arbeitsplan wurde erfolgreich gespeichert!
              </div>
            )}
            
            {!isDirty && !saveSuccess && (
              <div className="mt-4 text-sm text-gray-500 italic">
                Alle Änderungen sind gespeichert.
              </div>
            )}
          </div>

          {/* Day Overrides */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Ausnahme hinzufügen</h2>
              <form onSubmit={handleAddOverride} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                    <input
                      type="date"
                      required
                      className="w-full border-gray-300 bg-white text-gray-900 rounded px-3 py-2 border focus:ring-[#15803D] focus:border-[#15803D]"
                      value={overrideDate}
                      onChange={(e) => setOverrideDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                    <select
                      className="w-full border-gray-300 bg-white text-gray-900 rounded px-3 py-2 border focus:ring-[#15803D] focus:border-[#15803D]"
                      value={overrideType}
                      onChange={(e) => setOverrideType(e.target.value as any)}
                    >
                      <option value="day_off">Freier Tag</option>
                      <option value="extra_hours">Sonderzeit</option>
                    </select>
                  </div>
                </div>

                {overrideType === 'extra_hours' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Startzeit</label>
                      <input
                        type="time"
                        className="w-full border-gray-300 bg-white text-gray-900 rounded px-3 py-2 border focus:ring-[#15803D] focus:border-[#15803D]"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Endzeit</label>
                      <input
                        type="time"
                        className="w-full border-gray-300 bg-white text-gray-900 rounded px-3 py-2 border focus:ring-[#15803D] focus:border-[#15803D]"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grund (optional)</label>
                  <input
                    type="text"
                    className="w-full border-gray-300 bg-white text-gray-900 rounded px-3 py-2 border focus:ring-[#15803D] focus:border-[#15803D]"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="z.B. Urlaub, Krankheit..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#15803D] text-white font-medium py-2 rounded hover:bg-[#166534] transition-colors"
                >
                  Ausnahme hinzufügen
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Aktive Ausnahmen</h2>
              <div className="space-y-3">
                {overrides.length === 0 && <p className="text-gray-500 italic">Keine Ausnahmen geplant.</p>}
                {overrides.map(ovr => (
                  <div key={ovr.id} className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200">
                    <div>
                      <div className="font-bold text-gray-900">{new Date(ovr.date).toLocaleDateString('de-DE')}</div>
                      <div className="text-sm text-gray-700">
                        {ovr.override_type === 'day_off' ? 'Freigestellt' : `Sonderzeit: ${ovr.custom_start_time?.substring(0,5)} - ${ovr.custom_end_time?.substring(0,5)}`}
                      </div>
                      {ovr.reason && <div className="text-xs text-gray-500 italic mt-1">{ovr.reason}</div>}
                    </div>
                    <button
                      onClick={() => {
                        if(window.confirm('Ausnahme wirklich löschen?')) {
                           handleDeleteOverride(ovr.id);
                        }
                      }}
                      className="text-red-600 text-sm font-medium hover:underline hover:text-red-800"
                    >
                      Löschen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

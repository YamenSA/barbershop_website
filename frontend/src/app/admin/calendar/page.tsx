'use client';

import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, DatesSetArg, EventInput } from '@fullcalendar/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAppointments, getTeamMembers, getServices } from '@/lib/api';
import type { Appointment, TeamMember, Service } from '@/lib/types';
import AppointmentForm from '@/components/admin/AppointmentForm';
import AppointmentModal from '@/components/admin/AppointmentModal';
import DailyPlanExport from '@/components/admin/DailyPlanExport';

const STATUS_COLORS: Record<Appointment['status'], string> = {
  confirmed: '#6366f1',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#f59e0b',
};

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filterMemberId, setFilterMemberId] = useState('');

  const [formStartsAt, setFormStartsAt] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const rangeRef = useRef<{ from: string; to: string } | null>(null);

  useEffect(() => {
    getTeamMembers(true).then(setMembers);
    getServices(true).then(setServices);
  }, []);

  const fetchAppointments = useCallback(
    async (from: string, to: string, memberId?: string) => {
      const data = await getAppointments({
        from_date: from,
        to_date: to,
        ...(memberId ? { team_member_id: memberId } : {}),
      });
      setAppointments(data);
    },
    [],
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const from = arg.startStr.slice(0, 10);
      const to = arg.endStr.slice(0, 10);
      rangeRef.current = { from, to };
      fetchAppointments(from, to, filterMemberId || undefined);
    },
    [fetchAppointments, filterMemberId],
  );

  const handleFilterChange = (memberId: string) => {
    setFilterMemberId(memberId);
    if (rangeRef.current) {
      fetchAppointments(rangeRef.current.from, rangeRef.current.to, memberId || undefined);
    }
  };

  const serviceNames = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s.name])),
    [services],
  );

  const memberNames = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.name])),
    [members],
  );

  const events: EventInput[] = appointments.map((a) => ({
    id: a.id,
    title: `${serviceNames[a.service_id] ?? '?'} – ${a.guest_name ?? memberNames[a.team_member_id] ?? ''}`,
    start: a.starts_at,
    end: a.ends_at,
    backgroundColor: STATUS_COLORS[a.status],
    borderColor: STATUS_COLORS[a.status],
    extendedProps: { appointmentId: a.id },
  }));

  const handleSelect = (arg: DateSelectArg) => {
    const localDt = new Date(arg.start);
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${localDt.getFullYear()}-${pad(localDt.getMonth() + 1)}-${pad(localDt.getDate())}T${pad(localDt.getHours())}:${pad(localDt.getMinutes())}`;
    setFormStartsAt(iso);
    setShowForm(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const id = arg.event.extendedProps.appointmentId as string;
    const appt = appointments.find((a) => a.id === id);
    if (appt) setSelectedAppt(appt);
  };

  const handleSaved = () => {
    setShowForm(false);
    if (rangeRef.current) {
      fetchAppointments(rangeRef.current.from, rangeRef.current.to, filterMemberId || undefined);
    }
  };

  const handleUpdated = (updated: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelectedAppt(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Mitarbeiter:</label>
          <select
            value={filterMemberId}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Alle</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <DailyPlanExport />
          <button
            onClick={() => { setFormStartsAt(''); setShowForm(true); }}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Walk-in
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay',
          }}
          locale="de"
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          height="auto"
          selectable
          selectMirror
          events={events}
          datesSet={handleDatesSet}
          select={handleSelect}
          eventClick={handleEventClick}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-600">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {status === 'confirmed' ? 'Bestätigt' :
              status === 'completed' ? 'Abgeschlossen' :
              status === 'cancelled' ? 'Storniert' : 'Nicht erschienen'}
          </span>
        ))}
      </div>

      {showForm && (
        <AppointmentForm
          initialStartsAt={formStartsAt}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {selectedAppt && (
        <AppointmentModal
          appointment={selectedAppt}
          serviceNames={serviceNames}
          memberNames={memberNames}
          onClose={() => setSelectedAppt(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

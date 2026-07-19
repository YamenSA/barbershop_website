'use client';

import { useState, useEffect } from 'react';
import { apiFetch, getCustomers, CustomerListOut } from '@/lib/api';
import { Customer, Appointment } from '@/lib/types';
import { getAppointments } from '@/lib/api';

export default function CustomersPage() {
  const [data, setData] = useState<CustomerListOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAnonymized, setShowAnonymized] = useState(false);
  
  const [historyModalCustomer, setHistoryModalCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Appointment[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    loadCustomers();
  }, [page, showAnonymized]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCustomers({
        search,
        limit,
        offset: (page - 1) * limit,
        include_anonymized: showAnonymized,
      });
      setData(res);
    } catch (e: any) {
      if (e.status === 401 || e.status === 403) {
        setError('Keine Berechtigung, Kundendaten einzusehen.');
      } else {
        setError(e.message || 'Fehler beim Laden der Kunden.');
      }
    } finally {
      setLoading(false);
    }
  };

  const [deleteModalCustomer, setDeleteModalCustomer] = useState<{id: string, name: string} | null>(null);

  const confirmAnonymize = async () => {
    if (!deleteModalCustomer) return;
    
    try {
      await apiFetch(`/customers/${deleteModalCustomer.id}`, { method: 'DELETE' });
      alert('Kunde wurde erfolgreich anonymisiert.');
      loadCustomers();
    } catch (e: any) {
      alert(e.message || 'Fehler beim Anonymisieren des Kunden.');
    } finally {
      setDeleteModalCustomer(null);
    }
  };

  const openHistory = async (customer: Customer) => {
    setHistoryModalCustomer(customer);
    setHistory(null);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const appointments = await getAppointments({ customer_id: customer.id });
      setHistory(appointments);
    } catch (e: any) {
      setHistoryError(e.message || 'Fehler beim Laden der Terminhistorie.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '–';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? '–' : d.toLocaleDateString('de-DE');
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  if (loading && !data) return <div className="p-8 text-[var(--admin-text-muted)]">Kunden werden geladen...</div>;
  if (error && !data) return <div className="p-8 text-red-600 bg-red-50">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">Kunden</h1>
          <p className="text-[var(--admin-text-muted)]">Kundendaten und Terminhistorie verwalten.</p>
        </div>
      </div>

      <div className="bg-[var(--admin-surface)] p-6 rounded-lg shadow border border-[var(--admin-border)] space-y-4">
        <div className="flex justify-between items-center gap-4">
          <input
            type="text"
            placeholder="Suchen nach Name, E-Mail oder Telefon..."
            className="flex-1 max-w-md border border-[var(--admin-border)] bg-white text-[var(--admin-text)] rounded px-3 py-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-[var(--admin-text)]">
            <input
              type="checkbox"
              checked={showAnonymized}
              onChange={(e) => setShowAnonymized(e.target.checked)}
              className="rounded text-[var(--admin-primary)] focus:ring-[var(--admin-primary)]"
            />
            Gelöschte anzeigen
          </label>
        </div>

        {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--admin-border-strong)] text-[var(--admin-text)]">
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Kontaktdaten</th>
                <th className="py-3 px-4 font-semibold">Registriert am</th>
                <th className="py-3 px-4 font-semibold">Letzte Aktivität</th>
                <th className="py-3 px-4 font-semibold text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(customer => (
                <tr key={customer.id} className="border-b border-[var(--admin-border)] hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className={`font-medium ${customer.anonymized_at ? 'text-[var(--admin-text-muted)] italic' : 'text-[var(--admin-text)]'}`}>
                      {customer.name}
                    </span>
                    {customer.anonymized_at && (
                      <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">Anonymisiert</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--admin-text-muted)]">
                    {!customer.anonymized_at ? (
                      <>
                        <div>{customer.email}</div>
                        {customer.phone && <div>{customer.phone}</div>}
                      </>
                    ) : (
                      <span className="italic">Keine Daten</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--admin-text-muted)]">
                    {formatDate(customer.created_at)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--admin-text-muted)]">
                    {formatDate(customer.last_active_at)}
                  </td>
                  <td className="py-3 px-4 text-right space-x-3">
                    <button
                      onClick={() => openHistory(customer)}
                      className="text-[var(--admin-primary)] text-sm font-medium hover:underline"
                    >
                      Historie
                    </button>
                    {!customer.anonymized_at && (
                      <button
                        onClick={() => setDeleteModalCustomer({id: customer.id, name: customer.name})}
                        className="text-red-600 text-sm font-medium hover:underline"
                      >
                        Löschen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--admin-text-muted)]">
                    Keine Kunden gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-[var(--admin-border)] rounded text-[var(--admin-text)] disabled:opacity-50"
            >
              Zurück
            </button>
            <span className="text-sm text-[var(--admin-text-muted)]">
              Seite {page} von {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-[var(--admin-border)] rounded text-[var(--admin-text)] disabled:opacity-50"
            >
              Weiter
            </button>
          </div>
        )}
      </div>

      {/* History Modal */}
      {historyModalCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--admin-surface)] rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--admin-border-strong)] flex justify-between items-center">
              <h2 className="text-xl font-bold text-[var(--admin-text)]">
                Terminhistorie: {historyModalCustomer.name}
              </h2>
              <button
                onClick={() => setHistoryModalCustomer(null)}
                className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {historyLoading && <p className="text-[var(--admin-text-muted)]">Lade Historie...</p>}
              {historyError && <p className="text-red-600 bg-red-50 p-2 rounded">{historyError}</p>}
              {history && history.length === 0 && (
                <p className="text-[var(--admin-text-muted)]">Keine Termine gefunden.</p>
              )}
              {history && history.length > 0 && (
                <div className="space-y-3">
                  {history.map(app => (
                    <div key={app.id} className="border border-[var(--admin-border)] p-3 rounded bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-[var(--admin-text)]">
                            {new Date(app.starts_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          <div className="text-sm text-[var(--admin-text-muted)]">
                            Status: <span className="font-semibold">{app.status}</span>
                          </div>
                        </div>
                        {app.notes && (
                          <div className="text-sm text-[var(--admin-text-muted)] italic max-w-xs text-right">
                            {app.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--admin-surface)] rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5">
              <h2 className="text-xl font-bold text-[var(--admin-text)] mb-3">
                Kunde wirklich löschen?
              </h2>
              <p className="text-[var(--admin-text-muted)] mb-5">
                Möchten Sie die Daten von <span className="font-semibold text-[var(--admin-text)]">{deleteModalCustomer.name}</span> wirklich unwiderruflich anonymisieren? Dieser Vorgang kann nicht rückgängig gemacht werden. Personenbezogene Daten werden sofort überschrieben.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteModalCustomer(null)}
                  className="px-4 py-2 border border-[var(--admin-border)] rounded text-[var(--admin-text)] hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmAnonymize}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Unwiderruflich löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
